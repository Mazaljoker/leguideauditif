/**
 * Propagation rpps_audioprothesistes → centres_auditifs.
 *
 * Trigger : cron 30 min après chaque sync FHIR (1er + 15 du mois) ou manuel admin.
 *
 * Stratégie de matching :
 *   1. centres_auditifs.rpps == rpps_audioprothesistes.rpps (exact)
 *   2. centres_auditifs.siret == rpps_audioprothesistes.siret (exact, si rpps null)
 *   3. (V2) fuzzy nom + CP — non implémenté cette PR
 *
 * Protection fiches claimed/premium :
 *   - Si plan IN ('claimed', 'premium') OU claim_status='approved' → SKIP update
 *   - Mais flag pour review humaine (email Franck-Olivier + page admin)
 *
 * Pour les nouveaux RPPS détectés (sans match) :
 *   - Créer une fiche centres_auditifs (plan='rpps') basée sur les données RPPS
 *   - Géocodage BAN non inclus cette PR (lat/lng restent null) → V2
 *
 * Mode dry-run par défaut : montre ce qui changerait sans toucher la DB.
 *
 * Cf. PRD sprint A propagation (signal terrain Thomas Perron, 27 avril 2026).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export interface RppsRecord {
  rpps: string;
  civilite: string | null;
  nom: string | null;
  prenom: string | null;
  siret: string | null;
  raison_sociale: string | null;
  enseigne: string | null;
  num_voie: string | null;
  type_voie: string | null;
  voie: string | null;
  code_postal: string | null;
  commune: string | null;
  telephone: string | null;
  email: string | null;
  departement_code: string | null;
  updated_at: string;
}

export interface CentreRecord {
  id: string;
  slug: string;
  nom: string | null;
  rpps: string | null;
  siret: string | null;
  adresse: string | null;
  cp: string | null;
  ville: string | null;
  plan: 'rpps' | 'claimed' | 'premium' | null;
  claim_status: 'none' | 'pending' | 'approved' | 'rejected' | null;
  claimed_by_email: string | null;
}

export interface FlaggedForReview {
  centre_id: string;
  centre_slug: string;
  centre_plan: string;
  claimed_by_email: string | null;
  rpps: string;
  practitioner_name: string;
  old_address: string;
  new_address: string;
  change_summary: string;
}

export interface ChangeApplied {
  centre_id: string | null; // null pour les creates en dry-run avant insert
  centre_slug: string | null;
  rpps: string;
  action: 'create' | 'update';
  fields_changed: Record<string, { from: unknown; to: unknown }>;
}

export interface PropagationRunResult {
  runId: string;
  status: 'success' | 'failed';
  triggerSource: 'manual' | 'cron';
  applyMode: boolean;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  sinceIso: string | null;
  centresCreated: number;
  centresUpdated: number;
  centresSkippedClaimed: number;
  centresUnmatched: number;
  flaggedForReview: FlaggedForReview[];
  changesApplied: ChangeApplied[];
  errorMessage?: string;
}

export interface RunPropagationOptions {
  triggerSource: 'manual' | 'cron';
  applyMode: boolean;
}

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Reconstitue l'adresse normalisée depuis les champs RPPS éclatés.
 * Format : "12 RUE DU MARCHE" (sans CP/ville, qui sont stockés à part).
 */
function buildRppsAdresse(r: RppsRecord): string {
  return [r.num_voie, r.type_voie, r.voie]
    .map((s) => (s ?? '').trim())
    .filter((s) => s.length > 0)
    .join(' ')
    .trim();
}

function normaliseStr(s: string | null | undefined): string {
  return (s ?? '').trim().toLocaleLowerCase('fr-FR');
}

/**
 * Slug stable pour une nouvelle fiche RPPS : `prenom-nom-cp-ville-rpps6`.
 * Pattern aligné sur scripts/etl-rpps-to-centres.mjs (audit du 10 avril).
 */
function buildSlugForNewRpps(r: RppsRecord): string {
  const slug = (s: string | null) =>
    (s ?? '')
      .toLocaleLowerCase('fr-FR')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const parts = [
    slug(r.prenom),
    slug(r.nom),
    r.code_postal ?? 'no-cp',
    slug(r.commune ?? 'unknown'),
    r.rpps.substring(0, 6), // suffixe pour unicité
  ].filter((p) => p.length > 0);
  return parts.join('-').substring(0, 80); // limite raisonnable
}

/**
 * Construit un payload "fiche centre" depuis un RPPS, pour create ou update.
 * Ne contient QUE les champs sourcés du RPPS (pas de claim_*, plan, etc.).
 */
function buildCentrePayload(r: RppsRecord): Record<string, unknown> {
  const adresse = buildRppsAdresse(r);
  const audioFullName = [r.prenom, r.nom].filter(Boolean).join(' ').trim();
  const nomCentre = r.enseigne ?? r.raison_sociale ?? `${audioFullName} Audioprothésiste`;
  return {
    rpps: r.rpps,
    siret: r.siret,
    nom: nomCentre,
    raison_sociale: r.raison_sociale,
    adresse: adresse || null,
    cp: r.code_postal,
    ville: r.commune,
    departement: r.departement_code,
    tel: r.telephone,
    email: r.email,
    audio_nom: r.nom,
    audio_prenom: r.prenom,
  };
}

/**
 * Calcule les colonnes qui changent réellement entre le RPPS et la fiche existante.
 * Ne propose une update QUE si au moins 1 champ diffère, et seulement pour les
 * colonnes qu'on autorise à propager (sourcées du RPPS).
 */
function diffCentreVsRpps(
  centre: CentreRecord & {
    raison_sociale?: string | null;
    audio_nom?: string | null;
    audio_prenom?: string | null;
    departement?: string | null;
    tel?: string | null;
    email?: string | null;
  },
  payload: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, newVal] of Object.entries(payload)) {
    if (newVal === null || newVal === undefined || newVal === '') continue;
    const oldVal = (centre as Record<string, unknown>)[key];
    if (normaliseStr(String(oldVal ?? '')) === normaliseStr(String(newVal))) continue;
    // On ne propage pas si l'ancienne valeur est non vide et différente :
    // exception adresse/cp/ville/tel/email où on veut la mise à jour FHIR.
    // Pour les meta administratifs (siret, raison_sociale), même règle : update si différent.
    diff[key] = { from: oldVal ?? null, to: newVal };
  }
  return diff;
}

function summariseAddressChange(centre: CentreRecord, payload: Record<string, unknown>): string {
  const oldA = `${centre.adresse ?? '—'}, ${centre.cp ?? ''} ${centre.ville ?? ''}`.trim();
  const newA = `${payload.adresse ?? '—'}, ${payload.cp ?? ''} ${payload.ville ?? ''}`.trim();
  if (oldA === newA) return 'autres champs (nom, tel, email…)';
  return `${oldA} → ${newA}`;
}

// ──────────────────────────────────────────────────────────────────────
// Récupère les RPPS modifiés depuis la dernière propagation
// ──────────────────────────────────────────────────────────────────────

/**
 * Lit la date de la dernière propagation success. Fallback : avant le snapshot
 * initial du 10 avril (`2026-01-01`) → première fois on propage tout ce qui a
 * été touché par la sync FHIR récente.
 */
async function resolveSinceDate(supabase: SupabaseClient): Promise<Date> {
  const { data } = await supabase
    .from('rpps_propagation_runs')
    .select('started_at')
    .eq('status', 'success')
    .eq('apply_mode', true)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.started_at) return new Date(data.started_at as string);
  return new Date('2026-04-10T00:00:00Z'); // post-snapshot initial
}

async function fetchUpdatedRpps(supabase: SupabaseClient, sinceIso: string): Promise<RppsRecord[]> {
  const PAGE = 1000;
  const all: RppsRecord[] = [];
  let off = 0;
  while (true) {
    const { data, error } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps, civilite, nom, prenom, siret, raison_sociale, enseigne, num_voie, type_voie, voie, code_postal, commune, telephone, email, departement_code, updated_at')
      .eq('etat_rpps', 'actif')
      .gte('updated_at', sinceIso)
      .order('updated_at', { ascending: true })
      .range(off, off + PAGE - 1);
    if (error) throw new Error(`Failed to load updated RPPS: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as RppsRecord[]));
    if (data.length < PAGE) break;
    off += PAGE;
  }
  return all;
}

// ──────────────────────────────────────────────────────────────────────
// Matching : trouve la fiche centres_auditifs correspondante (priorité 1+2)
// ──────────────────────────────────────────────────────────────────────

async function findMatchingCentre(supabase: SupabaseClient, r: RppsRecord): Promise<CentreRecord | null> {
  // Priorité 1 : match exact sur le RPPS
  const { data: byRpps } = await supabase
    .from('centres_auditifs')
    .select('id, slug, nom, rpps, siret, adresse, cp, ville, plan, claim_status, claimed_by_email, raison_sociale, audio_nom, audio_prenom, departement, tel, email')
    .eq('rpps', r.rpps)
    .eq('is_demo', false)
    .limit(1)
    .maybeSingle();
  if (byRpps) return byRpps as unknown as CentreRecord;

  // Priorité 2 : match exact sur le SIRET (si RPPS pas en DB)
  if (r.siret) {
    const { data: bySiret } = await supabase
      .from('centres_auditifs')
      .select('id, slug, nom, rpps, siret, adresse, cp, ville, plan, claim_status, claimed_by_email, raison_sociale, audio_nom, audio_prenom, departement, tel, email')
      .eq('siret', r.siret)
      .eq('is_demo', false)
      .is('rpps', null) // évite de match un siret partagé entre 2 audios différents
      .limit(1)
      .maybeSingle();
    if (bySiret) return bySiret as unknown as CentreRecord;
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Run propagation (orchestrateur)
// ──────────────────────────────────────────────────────────────────────

export async function runRppsPropagation(
  supabase: SupabaseClient,
  opts: RunPropagationOptions,
): Promise<PropagationRunResult> {
  const startedAt = new Date();
  const sinceDate = await resolveSinceDate(supabase);

  // 1. Crée la ligne run
  const { data: runRow, error: runErr } = await supabase
    .from('rpps_propagation_runs')
    .insert({
      started_at: startedAt.toISOString(),
      status: 'running',
      trigger_source: opts.triggerSource,
      apply_mode: opts.applyMode,
      since_iso: sinceDate.toISOString(),
    })
    .select('id')
    .single();
  if (runErr || !runRow) {
    throw new Error(`Failed to create rpps_propagation_runs row: ${runErr?.message}`);
  }
  const runId = runRow.id as string;

  try {
    // 2. Charge les RPPS modifiés depuis sinceDate
    const updated = await fetchUpdatedRpps(supabase, sinceDate.toISOString());

    let centresCreated = 0;
    let centresUpdated = 0;
    let centresSkippedClaimed = 0;
    let centresUnmatched = 0;
    const flaggedForReview: FlaggedForReview[] = [];
    const changesApplied: ChangeApplied[] = [];

    // 3. Traite chaque RPPS modifié
    for (const r of updated) {
      const match = await findMatchingCentre(supabase, r);
      const payload = buildCentrePayload(r);

      if (!match) {
        // Aucun match → créer une fiche plan='rpps' (priorité 3 fuzzy = V2)
        centresUnmatched += 1;
        const newSlug = buildSlugForNewRpps(r);
        const insertPayload = {
          ...payload,
          slug: newSlug,
          plan: 'rpps' as const,
          claim_status: 'none' as const,
          source: 'rpps_propagation',
          is_demo: false,
        };
        if (opts.applyMode) {
          const { error } = await supabase.from('centres_auditifs').insert(insertPayload);
          if (error) {
            console.error(`[propagate] insert failed for rpps ${r.rpps}: ${error.message}`);
            continue;
          }
          centresCreated += 1;
        }
        changesApplied.push({
          centre_id: null,
          centre_slug: newSlug,
          rpps: r.rpps,
          action: 'create',
          fields_changed: Object.fromEntries(
            Object.entries(insertPayload).map(([k, v]) => [k, { from: null, to: v }]),
          ),
        });
        continue;
      }

      // Match trouvé. Si la fiche est claimed/premium ou claim approved → flag review.
      const isProtected =
        match.plan === 'claimed' ||
        match.plan === 'premium' ||
        match.claim_status === 'approved';

      if (isProtected) {
        centresSkippedClaimed += 1;
        const diff = diffCentreVsRpps(match, payload);
        if (Object.keys(diff).length > 0) {
          flaggedForReview.push({
            centre_id: match.id,
            centre_slug: match.slug,
            centre_plan: match.plan ?? 'rpps',
            claimed_by_email: match.claimed_by_email,
            rpps: r.rpps,
            practitioner_name: [r.prenom, r.nom].filter(Boolean).join(' '),
            old_address: `${match.adresse ?? '—'}, ${match.cp ?? ''} ${match.ville ?? ''}`.trim(),
            new_address: `${payload.adresse ?? '—'}, ${payload.cp ?? ''} ${payload.ville ?? ''}`.trim(),
            change_summary: summariseAddressChange(match, payload),
          });
        }
        continue;
      }

      // Fiche non protégée → diff + update si changements
      const diff = diffCentreVsRpps(match, payload);
      if (Object.keys(diff).length === 0) continue; // déjà à jour

      if (opts.applyMode) {
        // On n'applique que les colonnes du diff, jamais l'objet entier (évite
        // d'écraser des colonnes hors RPPS comme a_propos, photo_url, etc.)
        const updatePatch: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        for (const [k, v] of Object.entries(diff)) {
          updatePatch[k] = v.to;
        }
        const { error } = await supabase
          .from('centres_auditifs')
          .update(updatePatch)
          .eq('id', match.id);
        if (error) {
          console.error(`[propagate] update failed for centre ${match.id}: ${error.message}`);
          continue;
        }
        centresUpdated += 1;
      } else {
        // Dry-run : on compte quand même pour le rapport
        centresUpdated += 1;
      }
      changesApplied.push({
        centre_id: match.id,
        centre_slug: match.slug,
        rpps: r.rpps,
        action: 'update',
        fields_changed: diff,
      });
    }

    // 4. Update run row → success
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    await supabase
      .from('rpps_propagation_runs')
      .update({
        completed_at: completedAt.toISOString(),
        status: 'success',
        centres_created: centresCreated,
        centres_updated: centresUpdated,
        centres_skipped_claimed: centresSkippedClaimed,
        centres_unmatched: centresUnmatched,
        flagged_for_review: flaggedForReview,
        changes_applied: changesApplied,
        duration_seconds: durationSeconds,
      })
      .eq('id', runId);

    return {
      runId,
      status: 'success',
      triggerSource: opts.triggerSource,
      applyMode: opts.applyMode,
      startedAt,
      completedAt,
      durationSeconds,
      sinceIso: sinceDate.toISOString(),
      centresCreated,
      centresUpdated,
      centresSkippedClaimed,
      centresUnmatched,
      flaggedForReview,
      changesApplied,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);
    await supabase
      .from('rpps_propagation_runs')
      .update({
        completed_at: completedAt.toISOString(),
        status: 'failed',
        error_message: message,
        duration_seconds: durationSeconds,
      })
      .eq('id', runId);
    return {
      runId,
      status: 'failed',
      triggerSource: opts.triggerSource,
      applyMode: opts.applyMode,
      startedAt,
      completedAt,
      durationSeconds,
      sinceIso: sinceDate.toISOString(),
      centresCreated: 0,
      centresUpdated: 0,
      centresSkippedClaimed: 0,
      centresUnmatched: 0,
      flaggedForReview: [],
      changesApplied: [],
      errorMessage: message,
    };
  }
}
