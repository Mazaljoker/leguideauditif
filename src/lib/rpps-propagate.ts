/**
 * Propagation rpps_audioprothesistes → centres_auditifs.
 *
 * Trigger : cron 30 min après chaque sync FHIR (1er + 15 du mois) ou manuel admin.
 *
 * Stratégie de matching :
 *   1. centres_auditifs.rpps == rpps_audioprothesistes.rpps (exact)
 *   1bis (V2) centres_auditifs.siret == rpps_practitioner_roles.siret (exact, si centre.rpps null)
 *        — capte les lieux secondaires d'un audio (ex: Thomas Perron à Bayonne, alors
 *        que son Practitioner principal est à Pessac).
 *   2. centres_auditifs.siret == rpps_audioprothesistes.siret (exact, si rpps null)
 *   3. (V3) fuzzy nom + CP — non implémenté cette PR
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

/**
 * V2 — un lieu d'exercice (PractitionerRole) côté FHIR.
 * Sert à matcher centre.siret == role.siret (priorité 1bis) et à construire
 * le payload de la fiche depuis ce lieu (pas le Practitioner principal).
 */
export interface RoleRecord {
  rpps: string;
  role_id: string;
  siret: string | null;
  raison_sociale: string | null;
  enseigne: string | null;
  num_voie: string | null;
  type_voie: string | null;
  voie: string | null;
  code_postal: string | null;
  commune: string | null;
  departement_code: string | null;
  telephone: string | null;
  email: string | null;
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
function buildRppsAdresse(r: RppsRecord | RoleRecord): string {
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
 * V2 — payload depuis un rôle (PractitionerRole). Diffère de buildCentrePayload :
 * l'adresse/CP/ville/tel/email viennent du LIEU (pas du Practitioner principal).
 * On enrichit avec nom/prénom du Practitioner principal pour l'audio_nom / audio_prenom
 * (un rôle ne porte pas le nom du praticien — il faut joindre RppsRecord).
 *
 * Cas Thomas Perron : RppsRecord = Practitioner Pessac, RoleRecord = lieu Bayonne.
 * Le payload doit refléter l'adresse Bayonne mais l'audio reste Thomas Perron.
 */
function buildCentrePayloadFromRole(role: RoleRecord, practitioner: RppsRecord): Record<string, unknown> {
  const adresse = buildRppsAdresse(role);
  const audioFullName = [practitioner.prenom, practitioner.nom].filter(Boolean).join(' ').trim();
  const nomCentre = role.enseigne ?? role.raison_sociale ?? `${audioFullName} Audioprothésiste`;
  return {
    rpps: practitioner.rpps,
    siret: role.siret,
    nom: nomCentre,
    raison_sociale: role.raison_sociale,
    adresse: adresse || null,
    cp: role.code_postal,
    ville: role.commune,
    departement: role.departement_code,
    tel: role.telephone,
    email: role.email,
    audio_nom: practitioner.nom,
    audio_prenom: practitioner.prenom,
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
// Matching : trouve les fiches centres_auditifs correspondantes (priorité 1+2)
// en batch — 2 SELECTs au total au lieu de 2*N (où N = nombre de RPPS).
// ──────────────────────────────────────────────────────────────────────

const CENTRE_FIELDS =
  'id, slug, nom, rpps, siret, adresse, cp, ville, plan, claim_status, claimed_by_email, raison_sociale, audio_nom, audio_prenom, departement, tel, email';

/**
 * Charge en batch toutes les fiches centres_auditifs dont le RPPS est dans
 * la liste fournie. Pagine par chunks de 500 pour éviter les URL trop longues
 * (limite Supabase REST ~32 KB → ~2000 RPPS de 11 chars + boilerplate).
 */
async function batchLoadCentresByRpps(
  supabase: SupabaseClient,
  rppsList: string[],
): Promise<Map<string, CentreRecord>> {
  const byRpps = new Map<string, CentreRecord>();
  if (rppsList.length === 0) return byRpps;

  const CHUNK = 500;
  for (let i = 0; i < rppsList.length; i += CHUNK) {
    const chunk = rppsList.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select(CENTRE_FIELDS)
      .in('rpps', chunk)
      .eq('is_demo', false);
    if (error) throw new Error(`batchLoadCentresByRpps failed: ${error.message}`);
    for (const c of (data ?? []) as unknown as CentreRecord[]) {
      if (c.rpps) byRpps.set(c.rpps, c);
    }
  }
  return byRpps;
}

/**
 * V2 — charge en batch tous les rôles (rpps_practitioner_roles) pour les RPPS
 * fournis, qui ont un SIRET non null. Sert au matching priorité 1bis.
 *
 * Retourne :
 *   - byRpps : Map<rpps, RoleRecord[]>  — tous les rôles d'un praticien
 *   - bySiret : Map<siret, RoleRecord> — pour le matching SIRET → rpps secondaire
 */
async function batchLoadRolesByRpps(
  supabase: SupabaseClient,
  rppsList: string[],
): Promise<{ byRpps: Map<string, RoleRecord[]>; bySiret: Map<string, RoleRecord> }> {
  const byRpps = new Map<string, RoleRecord[]>();
  const bySiret = new Map<string, RoleRecord>();
  if (rppsList.length === 0) return { byRpps, bySiret };

  const FIELDS =
    'rpps, role_id, siret, raison_sociale, enseigne, num_voie, type_voie, voie, code_postal, commune, departement_code, telephone, email';
  const CHUNK = 500;
  for (let i = 0; i < rppsList.length; i += CHUNK) {
    const chunk = rppsList.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('rpps_practitioner_roles')
      .select(FIELDS)
      .in('rpps', chunk)
      .eq('etat_role', 'actif')
      .not('siret', 'is', null);
    if (error) throw new Error(`batchLoadRolesByRpps failed: ${error.message}`);
    for (const role of (data ?? []) as unknown as RoleRecord[]) {
      const list = byRpps.get(role.rpps) ?? [];
      list.push(role);
      byRpps.set(role.rpps, list);
      if (role.siret && !bySiret.has(role.siret)) {
        bySiret.set(role.siret, role);
      }
    }
  }
  return { byRpps, bySiret };
}

/**
 * Charge en batch toutes les fiches centres_auditifs dont le SIRET est dans
 * la liste fournie ET dont le RPPS est null (évite faux positifs sur un SIRET
 * partagé entre plusieurs audios — on ne veut matcher que les fiches sans
 * RPPS déjà identifié).
 */
async function batchLoadCentresBySiret(
  supabase: SupabaseClient,
  siretList: string[],
): Promise<Map<string, CentreRecord>> {
  const bySiret = new Map<string, CentreRecord>();
  if (siretList.length === 0) return bySiret;

  const CHUNK = 500;
  for (let i = 0; i < siretList.length; i += CHUNK) {
    const chunk = siretList.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select(CENTRE_FIELDS)
      .in('siret', chunk)
      .is('rpps', null)
      .eq('is_demo', false);
    if (error) throw new Error(`batchLoadCentresBySiret failed: ${error.message}`);
    for (const c of (data ?? []) as unknown as CentreRecord[]) {
      if (c.siret) bySiret.set(c.siret, c);
    }
  }
  return bySiret;
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

    // 3. Batch load des fiches centres correspondantes (priorité 1 + 1bis + 2)
    // → quelques queries au total au lieu de 3*N queries dans la boucle.
    // Critique pour la perf : sur 7152 RPPS modifiés, on évite 21000+ queries.
    const allRpps = updated.map((r) => r.rpps);
    const centresByRpps = await batchLoadCentresByRpps(supabase, allRpps);

    // V2 — priorité 1bis : matching via rpps_practitioner_roles.siret
    // Pour chaque RPPS, charger ses rôles (1+ lieux d'exercice). Puis chercher
    // les centres dont le SIRET correspond à un de ces rôles (avec centre.rpps null).
    const rolesIndex = await batchLoadRolesByRpps(supabase, allRpps);
    const roleSiretsToLookup = Array.from(rolesIndex.bySiret.keys());
    const centresByRoleSiret = await batchLoadCentresBySiret(supabase, roleSiretsToLookup);

    // Priorité 2 — siret du Practitioner principal (V1 fallback inchangé).
    // On ne charge QUE pour les RPPS pas encore matchés (par 1 ni par 1bis).
    const isMatchedByRoleSiret = (rpps: string): boolean => {
      const roles = rolesIndex.byRpps.get(rpps) ?? [];
      return roles.some((role) => role.siret && centresByRoleSiret.has(role.siret));
    };
    const siretsToLookup = updated
      .filter((r) => !centresByRpps.has(r.rpps) && !isMatchedByRoleSiret(r.rpps) && !!r.siret)
      .map((r) => r.siret as string);
    const centresBySiret = await batchLoadCentresBySiret(supabase, siretsToLookup);

    let centresCreated = 0;
    let centresUpdated = 0;
    let centresSkippedClaimed = 0;
    let centresUnmatched = 0;
    const flaggedForReview: FlaggedForReview[] = [];
    const changesApplied: ChangeApplied[] = [];

    // Évite de traiter 2x le même centre (un audio peut être primaire ET secondaire
    // sur le même SIRET — défensif).
    const processedCentreIds = new Set<string>();

    // V2 batch writes : on bufferise tous les writes pendant la boucle de
    // matching (en mémoire), puis on flush par chunks à la fin. Sans batching,
    // 6235 round-trips Supabase REST sequentiels = timeout Vercel 300s garanti.
    const inserts: Array<Record<string, unknown>> = [];
    const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
    let centresSkippedNoAddress = 0;

    // Closure : applique le diff/flag/update sur un match trouvé. Mute les
    // compteurs et arrays du scope. Réutilisée pour priorité 1, 1bis, 2.
    // En mode apply, on BUFFERISE l'update (flush par batch en fin de boucle).
    const processCentreUpdate = (params: {
      match: CentreRecord;
      payload: Record<string, unknown>;
      rpps: string;
      practitionerName: string;
    }): void => {
      const { match, payload, rpps, practitionerName } = params;
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
            rpps,
            practitioner_name: practitionerName,
            old_address: `${match.adresse ?? '—'}, ${match.cp ?? ''} ${match.ville ?? ''}`.trim(),
            new_address: `${payload.adresse ?? '—'}, ${payload.cp ?? ''} ${payload.ville ?? ''}`.trim(),
            change_summary: summariseAddressChange(match, payload),
          });
        }
        return;
      }

      const diff = diffCentreVsRpps(match, payload);
      if (Object.keys(diff).length === 0) return;

      if (opts.applyMode) {
        const updatePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        for (const [k, v] of Object.entries(diff)) {
          updatePatch[k] = v.to;
        }
        updates.push({ id: match.id, patch: updatePatch });
      }
      centresUpdated += 1;
      changesApplied.push({
        centre_id: match.id,
        centre_slug: match.slug,
        rpps,
        action: 'update',
        fields_changed: diff,
      });
    };

    // 4. Traite chaque RPPS modifié — matching en mémoire
    for (const r of updated) {
      const practitionerName = [r.prenom, r.nom].filter(Boolean).join(' ');

      // V2 — priorité 1bis : pour chaque rôle (lieu) du praticien avec un SIRET
      // qui matche un centre.rpps null, on traite la fiche avec le payload du rôle.
      const rolesForThisRpps = rolesIndex.byRpps.get(r.rpps) ?? [];
      for (const role of rolesForThisRpps) {
        if (!role.siret) continue;
        const centreSecondaire = centresByRoleSiret.get(role.siret);
        if (!centreSecondaire || processedCentreIds.has(centreSecondaire.id)) continue;
        if (centreSecondaire.rpps === r.rpps) continue;
        processedCentreIds.add(centreSecondaire.id);
        processCentreUpdate({
          match: centreSecondaire,
          payload: buildCentrePayloadFromRole(role, r),
          rpps: r.rpps,
          practitionerName,
        });
      }

      const match = centresByRpps.get(r.rpps)
        ?? (r.siret ? centresBySiret.get(r.siret) : undefined)
        ?? null;
      if (match && processedCentreIds.has(match.id)) continue;
      const payload = buildCentrePayload(r);

      if (!match) {
        // Skip si l'audio FHIR n'a pas d'adresse (colonnes NOT NULL côté DB :
        // adresse / cp / departement). Sans elles, l'INSERT fail.
        if (!payload.adresse || !payload.cp || !payload.departement) {
          centresSkippedNoAddress += 1;
          continue;
        }
        // Aucun match → créer une fiche plan='rpps' (priorité 3 fuzzy = V3)
        centresUnmatched += 1;
        const newSlug = buildSlugForNewRpps(r);
        const insertPayload = {
          ...payload,
          legacy_id: `rpps-${r.rpps}`, // NOT NULL côté DB, déterministe via RPPS
          slug: newSlug,
          plan: 'rpps' as const,
          claim_status: 'none' as const,
          source: 'rpps_propagation',
          is_demo: false,
        };
        if (opts.applyMode) {
          inserts.push(insertPayload);
        }
        // En dry-run on incrémente centresCreated pour le report. En apply,
        // c'est le batch flush qui décide après écriture réelle.
        if (!opts.applyMode) {
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

      // Match trouvé via priorité 1 ou 2 → délègue à la closure
      processedCentreIds.add(match.id);
      processCentreUpdate({
        match,
        payload,
        rpps: r.rpps,
        practitionerName,
      });
    }

    // 5. Flush des writes en batch (apply mode uniquement)
    let insertErrors = 0;
    let updateErrors = 0;
    if (opts.applyMode) {
      // 5a. INSERTs : .insert(rows[]) par chunks de 100
      const INSERT_CHUNK = 100;
      for (let i = 0; i < inserts.length; i += INSERT_CHUNK) {
        const chunk = inserts.slice(i, i + INSERT_CHUNK);
        const { error } = await supabase.from('centres_auditifs').insert(chunk);
        if (error) {
          // En cas d'erreur batch, fallback row-par-row pour identifier le row toxique
          // sans perdre les autres rows valides du chunk.
          console.error(`[propagate] batch insert failed (chunk ${i}-${i + chunk.length}): ${error.message}. Falling back to row-by-row.`);
          for (const row of chunk) {
            const { error: rowErr } = await supabase.from('centres_auditifs').insert(row);
            if (rowErr) {
              insertErrors += 1;
              console.error(`[propagate] row insert failed (legacy_id=${row.legacy_id}): ${rowErr.message}`);
            } else {
              centresCreated += 1;
            }
          }
        } else {
          centresCreated += chunk.length;
        }
      }

      // 5b. UPDATEs : Promise.all par chunks de 50 (concurrence Supabase REST safe)
      const UPDATE_CHUNK = 50;
      for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
        const chunk = updates.slice(i, i + UPDATE_CHUNK);
        const results = await Promise.all(
          chunk.map((u) =>
            supabase.from('centres_auditifs').update(u.patch).eq('id', u.id),
          ),
        );
        for (const r of results) {
          if (r.error) {
            updateErrors += 1;
            console.error(`[propagate] update failed: ${r.error.message}`);
          }
        }
      }
    }

    // 6. Update run row → success
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    if (centresSkippedNoAddress > 0 || insertErrors > 0 || updateErrors > 0) {
      console.warn(
        `[propagate] skipped_no_address=${centresSkippedNoAddress}, insert_errors=${insertErrors}, update_errors=${updateErrors}`,
      );
    }

    await supabase
      .from('rpps_propagation_runs')
      .update({
        completed_at: completedAt.toISOString(),
        status: 'success',
        centres_created: centresCreated,
        centres_updated: centresUpdated - updateErrors,
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
