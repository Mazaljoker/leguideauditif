/**
 * Helpers de sync RPPS depuis l'API FHIR Annuaire Santé.
 *
 * Source : https://gateway.api.esante.gouv.fr/fhir/v2
 * Auth : header `ESANTE-API-KEY` (gateway Gravitee, clé d'API persistante).
 * Profession ciblée : code 26 (audioprothésistes), nomenclature TRE-G15.
 *
 * Aligné sur la spec du skill `lga-rpps-detector` v1.0
 * (.claude/skills/lga-rpps-detector/SKILL.md) :
 *   - Query incrémentale : `qualification-code=26&active=true&_lastUpdated=ge{date}`
 *     → ne pulle que les changements depuis le dernier run success
 *   - Env var canonique : ESANTE_API_KEY (fallback RPPS_FHIR_API_KEY pour rétrocompat)
 *   - Mode `full=true` : ignore le filtre incrémental pour rafraîchissement complet
 *     périodique (recommandé : 1×/trimestre pour détecter les inactifs)
 *
 * Usage côté endpoint :
 *
 *   const result = await runRppsSync(supabase, { triggerSource: 'cron', mode: 'incremental' });
 *   if (result.newCentresDetected.length > 0) await sendSyncReport(result);
 *
 * Idempotent : upsert via .onConflict='rpps' (index UNIQUE sur rpps).
 * En mode `full`, les RPPS pas vus sont marqués etat_rpps='inactif'.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const FHIR_API_URL = import.meta.env.RPPS_FHIR_API_URL ?? 'https://gateway.api.esante.gouv.fr/fhir/v2';
// ESANTE_API_KEY est le nom canonique (cf. skill lga-rpps-detector).
// Fallback sur RPPS_FHIR_API_KEY pour ne pas casser les preview deployments
// qui auraient déjà la variable sous l'ancien nom.
const FHIR_API_KEY = import.meta.env.ESANTE_API_KEY ?? import.meta.env.RPPS_FHIR_API_KEY;
const PROFESSION_CODE_AUDIO = '26';
const FHIR_PAGE_SIZE = 200; // FHIR par défaut 20, on augmente pour limiter le nombre de pages.
const INITIAL_LOOKBACK_DAYS = 7; // Première exécution : pull les 7 derniers jours

// ──────────────────────────────────────────────────────────────────────
// Types FHIR (subset des champs Practitioner qu'on consomme)
// ──────────────────────────────────────────────────────────────────────

export interface FhirIdentifier {
  system?: string;
  value?: string;
  type?: { coding?: Array<{ system?: string; code?: string }> };
}

export interface FhirHumanName {
  family?: string;
  given?: string[];
  prefix?: string[];
}

export interface FhirAddress {
  line?: string[];
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface FhirContactPoint {
  system?: 'phone' | 'email' | 'fax' | 'url' | string;
  value?: string;
  use?: string;
}

export interface FhirQualification {
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
}

export interface FhirPractitioner {
  resourceType: 'Practitioner';
  id?: string;
  identifier?: FhirIdentifier[];
  name?: FhirHumanName[];
  address?: FhirAddress[];
  telecom?: FhirContactPoint[];
  qualification?: FhirQualification[];
}

export interface FhirBundleLink {
  relation: 'self' | 'next' | 'previous' | 'first' | 'last' | string;
  url: string;
}

export interface FhirBundleEntry {
  resource?: FhirPractitioner;
  fullUrl?: string;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  total?: number;
  entry?: FhirBundleEntry[];
  link?: FhirBundleLink[];
}

// ──────────────────────────────────────────────────────────────────────
// Types DB (mapping vers rpps_audioprothesistes)
// ──────────────────────────────────────────────────────────────────────

export interface RppsRow {
  rpps: string;
  civilite: string | null;
  nom: string | null;
  prenom: string | null;
  mode_exercice: string | null;
  siret: string | null;
  raison_sociale: string | null;
  enseigne: string | null;
  num_voie: string | null;
  type_voie: string | null;
  voie: string | null;
  code_postal: string | null;
  commune: string | null;
  pays: string | null;
  telephone: string | null;
  telephone2: string | null;
  email: string | null;
  departement_code: string | null;
  departement_lib: string | null;
}

export interface NewCentreDetected {
  rpps: string;
  nom: string | null;
  prenom: string | null;
  raison_sociale: string | null;
  enseigne: string | null;
  code_postal: string | null;
  commune: string | null;
  email: string | null;
  telephone: string | null;
}

export interface SyncRunResult {
  runId: string;
  status: 'success' | 'failed';
  triggerSource: 'manual' | 'cron';
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  rppsCountBefore: number;
  rppsCountAfter: number;
  rppsInserted: number;
  rppsUpdated: number;
  rppsMarkedInactive: number;
  newCentresDetected: NewCentreDetected[];
  errorMessage?: string;
}

// ──────────────────────────────────────────────────────────────────────
// FHIR fetch + pagination
// ──────────────────────────────────────────────────────────────────────

async function fetchFhirBundle(url: string): Promise<FhirBundle> {
  if (!FHIR_API_KEY) {
    throw new Error('RPPS_FHIR_API_KEY is not defined');
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/fhir+json',
      'ESANTE-API-KEY': FHIR_API_KEY,
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`FHIR API error ${response.status} ${response.statusText} on ${url}: ${body.substring(0, 300)}`);
  }
  const json = (await response.json()) as FhirBundle;
  if (json.resourceType !== 'Bundle') {
    throw new Error(`Expected FHIR Bundle, got ${(json as { resourceType?: string }).resourceType}`);
  }
  return json;
}

/**
 * Itère sur les Practitioner code 26 via pagination Bundle next links.
 *
 * @param sinceIso ISO8601 date — si fourni, ajoute `_lastUpdated=ge{sinceIso}`
 *                 pour ne pulle que les changements (mode incrémental).
 *                 Si null, full pull (pour le marquage inactif périodique).
 *
 * Aligné sur le skill lga-rpps-detector :
 *   `Practitioner?qualification-code=26&active=true&_lastUpdated=ge{last_run_date}`
 */
export async function* iterPractitioners(sinceIso: string | null): AsyncGenerator<FhirPractitioner> {
  const params = new URLSearchParams({
    'qualification-code': PROFESSION_CODE_AUDIO,
    active: 'true',
    _count: String(FHIR_PAGE_SIZE),
  });
  if (sinceIso) {
    params.set('_lastUpdated', `ge${sinceIso}`);
  }
  let nextUrl: string | null = `${FHIR_API_URL}/Practitioner?${params.toString()}`;

  let pageCount = 0;
  while (nextUrl) {
    pageCount += 1;
    const bundle = await fetchFhirBundle(nextUrl);
    for (const entry of bundle.entry ?? []) {
      if (entry.resource?.resourceType === 'Practitioner') {
        yield entry.resource;
      }
    }
    const next = bundle.link?.find((l) => l.relation === 'next');
    nextUrl = next?.url ?? null;
    // Garde-fou anti-boucle infinie (le RPPS audio en France compte ~7 200 inscrits,
    // donc 50 pages × 200 = 10 000 max raisonnable).
    if (pageCount > 100) {
      throw new Error(`FHIR pagination exceeded 100 pages, aborting (last url: ${nextUrl})`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Parse FHIR Practitioner → RppsRow
// ──────────────────────────────────────────────────────────────────────

/**
 * Normalise un identifier IDNPS/RPPS au format canonique 11 chiffres.
 * L'API FHIR Annuaire Santé expose des IDNPS 12 chiffres pour les audioprothésistes
 * (préfixe "8" + 11 chiffres RPPS). La table rpps_audioprothesistes stocke en 11
 * chiffres (format ASIP-Santé canonique). Pour matcher correctement les RPPS
 * existants, on strip le préfixe IDNPS si présent.
 *
 * Exemples :
 *   "810002460995" → "10002460995"  (IDNPS 12 → RPPS 11)
 *   "10002460995"  → "10002460995"  (déjà 11 chiffres, no-op)
 */
function normalizeRpps(value: string): string | null {
  const cleaned = value.trim();
  if (/^\d{11}$/.test(cleaned)) return cleaned;
  if (/^8\d{11}$/.test(cleaned)) return cleaned.substring(1); // IDNPS audio → RPPS
  return null;
}

function extractRpps(p: FhirPractitioner): string | null {
  // Le RPPS est un identifier de type IDNPS/RPPS. On cherche d'abord par system
  // contenant 'rpps' ou 'idnps', puis fallback sur tout identifier numérique
  // 11 ou 12 chiffres. Toutes les valeurs sont normalisées en RPPS 11 chiffres.
  for (const id of p.identifier ?? []) {
    const sys = id.system?.toLowerCase() ?? '';
    if ((sys.includes('rpps') || sys.includes('idnps')) && id.value) {
      const normalized = normalizeRpps(id.value);
      if (normalized) return normalized;
    }
    const code = id.type?.coding?.[0]?.code;
    if (code && /rpps|idnps/i.test(code) && id.value) {
      const normalized = normalizeRpps(id.value);
      if (normalized) return normalized;
    }
  }
  for (const id of p.identifier ?? []) {
    if (id.value) {
      const normalized = normalizeRpps(id.value);
      if (normalized) return normalized;
    }
  }
  return null;
}

function extractTelecom(p: FhirPractitioner, system: 'phone' | 'email'): string | null {
  for (const t of p.telecom ?? []) {
    if (t.system === system && t.value) return t.value;
  }
  return null;
}

function splitAddressLine(line: string | undefined): { numVoie: string | null; typeVoie: string | null; voie: string | null } {
  if (!line) return { numVoie: null, typeVoie: null, voie: null };
  const trimmed = line.trim();
  // Pattern simple : "12 BIS RUE DU MARCHE" → num=12, type=RUE, voie="DU MARCHE"
  // Limite : ne couvre pas tous les cas (cedex, lieu-dit, etc.) — on garde la ligne complète en `voie` si parse échoue.
  const match = trimmed.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s+([A-ZÉÈÊÀÂÔÎÏÇa-zéèêàâôîïç-]+)\s+(.+)$/);
  if (match) {
    return { numVoie: match[1].trim(), typeVoie: match[2].trim(), voie: match[3].trim() };
  }
  return { numVoie: null, typeVoie: null, voie: trimmed };
}

function departementFromCp(cp: string | null): string | null {
  if (!cp) return null;
  const clean = cp.trim();
  if (clean.startsWith('97') || clean.startsWith('98')) return clean.substring(0, 3);
  return clean.substring(0, 2);
}

export function parsePractitioner(p: FhirPractitioner): RppsRow | null {
  const rpps = extractRpps(p);
  if (!rpps) return null;

  const name = p.name?.[0];
  const address = p.address?.[0];
  const split = splitAddressLine(address?.line?.[0]);

  return {
    rpps,
    civilite: name?.prefix?.[0] ?? null,
    nom: name?.family ?? null,
    prenom: name?.given?.join(' ') ?? null,
    mode_exercice: null, // pas exposé directement par FHIR Practitioner
    siret: null, // FHIR Practitioner n'expose pas le SIRET (lié à PractitionerRole/Organization)
    raison_sociale: null,
    enseigne: null,
    num_voie: split.numVoie,
    type_voie: split.typeVoie,
    voie: split.voie,
    code_postal: address?.postalCode ?? null,
    commune: address?.city ?? null,
    pays: address?.country ?? 'FR',
    telephone: extractTelecom(p, 'phone'),
    telephone2: null,
    email: extractTelecom(p, 'email'),
    departement_code: departementFromCp(address?.postalCode ?? null),
    departement_lib: null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Run sync (orchestrateur)
// ──────────────────────────────────────────────────────────────────────

export interface RunRppsSyncOptions {
  triggerSource: 'manual' | 'cron';
  /**
   * `incremental` (défaut) : `_lastUpdated=ge{lastRunDate}` — ne pulle que les
   *   changements depuis le dernier run success, ne touche pas etat_rpps.
   * `full` : pulle tous les Practitioner code 26 actifs et marque inactif les
   *   RPPS non vus (last_seen_at < runStartedAt). À lancer manuellement
   *   ~1×/trimestre via /admin/rpps-sync (option à ajouter dans une v2 de l'UI).
   */
  mode?: 'incremental' | 'full';
}

/**
 * Récupère la date de référence pour le pull incrémental.
 * = max(started_at) des runs success, fallback today - 7 jours (première fois).
 */
async function resolveLastRunDate(supabase: SupabaseClient): Promise<Date> {
  const { data } = await supabase
    .from('rpps_sync_runs')
    .select('started_at')
    .eq('status', 'success')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.started_at) return new Date(data.started_at as string);
  const fallback = new Date();
  fallback.setUTCDate(fallback.getUTCDate() - INITIAL_LOOKBACK_DAYS);
  return fallback;
}

export async function runRppsSync(supabase: SupabaseClient, opts: RunRppsSyncOptions): Promise<SyncRunResult> {
  const startedAt = new Date();
  const mode = opts.mode ?? 'incremental';
  const lastRunDate = mode === 'incremental' ? await resolveLastRunDate(supabase) : null;

  // 1. Crée la ligne run (status='running')
  const { data: runRow, error: runErr } = await supabase
    .from('rpps_sync_runs')
    .insert({
      started_at: startedAt.toISOString(),
      status: 'running',
      trigger_source: opts.triggerSource,
    })
    .select('id')
    .single();
  if (runErr || !runRow) {
    throw new Error(`Failed to create rpps_sync_runs row: ${runErr?.message}`);
  }
  const runId = runRow.id as string;

  try {
    // 2. Comptage avant
    const { count: countBefore } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps', { count: 'exact', head: true });

    // 3. Charge les RPPS existants pour distinguer insert/update
    const existingRppsSet = new Set<string>();
    {
      const PAGE = 1000;
      let off = 0;
      while (true) {
        const { data, error } = await supabase
          .from('rpps_audioprothesistes')
          .select('rpps')
          .range(off, off + PAGE - 1);
        if (error) throw new Error(`Failed to load existing RPPS: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const r of data) {
          if (r.rpps) existingRppsSet.add(r.rpps as string);
        }
        if (data.length < PAGE) break;
        off += PAGE;
      }
    }

    // 4. Itère sur le flux FHIR, batch les rows pour upsert
    const seenRpps = new Set<string>();
    const newCentresDetected: NewCentreDetected[] = [];
    let inserted = 0;
    let updated = 0;
    const BATCH_SIZE = 100;
    let batch: RppsRow[] = [];

    // Strip les keys avec valeur "vide" avant upsert : sinon Supabase ECRASE les
    // colonnes existantes. Le FHIR Practitioner ne porte pas l'adresse d'exercice
    // (elle est sur PractitionerRole, pas implémenté ici), donc code_postal/commune/voie
    // etc. seraient null et écraseraient les valeurs existantes ingérées depuis le CSV
    // initial du 10 avril. On filtre aussi les undefined et empty strings — observé
    // après run du 27/04 : delta -18 emails inexpliqué, possiblement dû à des "" ou
    // undefined qui passaient le filtre original (v !== null seul).
    // Whitelist : on garde rpps + les tracking fields (updated_at, last_seen_at, etat_rpps)
    // toujours, même si vides — ils sont pilotés par le code, pas par le FHIR.
    const TRACKING_KEYS = new Set(['rpps', 'updated_at', 'last_seen_at', 'etat_rpps']);
    const stripEmpty = (obj: Record<string, unknown>): Record<string, unknown> => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (TRACKING_KEYS.has(k)) {
          out[k] = v;
          continue;
        }
        if (v === null || v === undefined) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        out[k] = v;
      }
      return out;
    };

    const flushBatch = async (): Promise<void> => {
      if (batch.length === 0) return;
      const rowsToWrite = batch.map((r) => stripEmpty({
        ...r,
        updated_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        etat_rpps: 'actif' as const,
      }));
      const { error } = await supabase
        .from('rpps_audioprothesistes')
        .upsert(rowsToWrite, { onConflict: 'rpps' });
      if (error) {
        throw new Error(`Failed to upsert batch (size ${batch.length}): ${error.message}`);
      }
      batch = [];
    };

    for await (const practitioner of iterPractitioners(lastRunDate?.toISOString() ?? null)) {
      const row = parsePractitioner(practitioner);
      if (!row) continue;
      if (seenRpps.has(row.rpps)) continue; // dédup au cas où FHIR renverrait le même RPPS 2x
      seenRpps.add(row.rpps);

      if (existingRppsSet.has(row.rpps)) {
        updated += 1;
      } else {
        inserted += 1;
        newCentresDetected.push({
          rpps: row.rpps,
          nom: row.nom,
          prenom: row.prenom,
          raison_sociale: row.raison_sociale,
          enseigne: row.enseigne,
          code_postal: row.code_postal,
          commune: row.commune,
          email: row.email,
          telephone: row.telephone,
        });
      }
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }
    await flushBatch();

    // 5. Marque inactif tous les RPPS pas vus dans ce run.
    // SEULEMENT en mode `full` : l'incrémental ne pulle que les changements
    // depuis lastRunDate, donc l'absence d'un RPPS ne signifie pas son inactivité.
    // last_seen_at < runStartedAt capture exactement les rows non touchés.
    let markedInactive = 0;
    if (mode === 'full' && seenRpps.size > 0) {
      const { count, error } = await supabase
        .from('rpps_audioprothesistes')
        .update({ etat_rpps: 'inactif', updated_at: new Date().toISOString() }, { count: 'exact' })
        .eq('etat_rpps', 'actif')
        .lt('last_seen_at', startedAt.toISOString());
      if (error) {
        // Plan B : log warn mais on ne fait pas échouer le run (ré-exécution possible).
        console.warn(`[rpps-sync] mark_inactive failed: ${error.message}`);
      } else {
        markedInactive = count ?? 0;
      }
    }

    // 6. Comptage après
    const { count: countAfter } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps', { count: 'exact', head: true });

    // 7. Update run row → success
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    await supabase
      .from('rpps_sync_runs')
      .update({
        completed_at: completedAt.toISOString(),
        status: 'success',
        rpps_count_before: countBefore ?? null,
        rpps_count_after: countAfter ?? null,
        rpps_inserted: inserted,
        rpps_updated: updated,
        rpps_marked_inactive: markedInactive,
        new_centres_detected: newCentresDetected,
        duration_seconds: durationSeconds,
      })
      .eq('id', runId);

    return {
      runId,
      status: 'success',
      triggerSource: opts.triggerSource,
      startedAt,
      completedAt,
      durationSeconds,
      rppsCountBefore: countBefore ?? 0,
      rppsCountAfter: countAfter ?? 0,
      rppsInserted: inserted,
      rppsUpdated: updated,
      rppsMarkedInactive: markedInactive,
      newCentresDetected,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);
    await supabase
      .from('rpps_sync_runs')
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
      startedAt,
      completedAt,
      durationSeconds,
      rppsCountBefore: 0,
      rppsCountAfter: 0,
      rppsInserted: 0,
      rppsUpdated: 0,
      rppsMarkedInactive: 0,
      newCentresDetected: [],
      errorMessage: message,
    };
  }
}
