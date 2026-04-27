/**
 * Helpers de sync RPPS depuis l'API FHIR Annuaire Santé.
 *
 * Source : https://gateway.api.esante.gouv.fr/fhir/v2
 * Auth : header `ESANTE-API-KEY` (gateway Gravitee, clé d'API persistante).
 * Profession ciblée : code 26 (audioprothésistes), nomenclature ASIP-Santé.
 *
 * Usage côté endpoint :
 *
 *   const result = await runRppsSync(supabase, { triggerSource: 'cron' });
 *   if (result.newCentresDetected.length > 0) {
 *     await sendSyncReport(result);
 *   }
 *
 * Idempotent : upsert via .onConflict='rpps' (la table a un index UNIQUE sur rpps).
 * Les RPPS qui ne reviennent plus dans le flux sont marqués etat_rpps='inactif'
 * en fin de run (UPDATE conditionnel sur last_seen_at < runStartedAt).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const FHIR_API_URL = import.meta.env.RPPS_FHIR_API_URL ?? 'https://gateway.api.esante.gouv.fr/fhir/v2';
const FHIR_API_KEY = import.meta.env.RPPS_FHIR_API_KEY;
const PROFESSION_CODE_AUDIO = '26';
const FHIR_PAGE_SIZE = 200; // FHIR par défaut 20, on augmente pour limiter le nombre de pages.

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
 * Itère paresseusement sur tous les Practitioner code 26 via le pattern Bundle next links.
 * Yield 1 Practitioner à la fois pour limiter la mémoire.
 */
export async function* iterPractitioners(): AsyncGenerator<FhirPractitioner> {
  // Note : la query exacte dépend du système FHIR exposé. La gateway Annuaire Santé
  // utilise typiquement `qualification:role` ou `_filter`. On passe par
  // `qualification` (search param standard FHIR) avec le code profession 26.
  let nextUrl: string | null =
    `${FHIR_API_URL}/Practitioner?qualification=${PROFESSION_CODE_AUDIO}&_count=${FHIR_PAGE_SIZE}`;

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

function extractRpps(p: FhirPractitioner): string | null {
  // Le RPPS est un identifier de type IDNPS/RPPS. On cherche d'abord par system
  // contenant 'rpps', puis on fallback sur tout identifier numérique de 11 chiffres.
  for (const id of p.identifier ?? []) {
    if (id.system && id.system.toLowerCase().includes('rpps') && id.value) {
      return id.value;
    }
    const code = id.type?.coding?.[0]?.code;
    if (code && /rpps|idnps/i.test(code) && id.value) {
      return id.value;
    }
  }
  for (const id of p.identifier ?? []) {
    if (id.value && /^\d{11}$/.test(id.value)) {
      return id.value;
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
}

export async function runRppsSync(supabase: SupabaseClient, opts: RunRppsSyncOptions): Promise<SyncRunResult> {
  const startedAt = new Date();

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

    const flushBatch = async (): Promise<void> => {
      if (batch.length === 0) return;
      const rowsToWrite = batch.map((r) => ({
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

    for await (const practitioner of iterPractitioners()) {
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
        });
      }
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
      }
    }
    await flushBatch();

    // 5. Marque inactif tous les RPPS pas vus dans ce run.
    // Approche par timestamp plutôt que par NOT IN (...) : avec ~7 200 RPPS, la liste
    // dépasserait la limite d'URL HTTP Supabase REST. last_seen_at < runStartedAt
    // capture exactement les rows qui n'ont pas été touchés par ce run.
    let markedInactive = 0;
    if (seenRpps.size > 0) {
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
