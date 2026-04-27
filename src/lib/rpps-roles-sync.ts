/**
 * Sync V2 — multi-lieux d'exercice via FHIR PractitionerRole.
 *
 * Différence vs V1 (rpps-sync.ts) :
 * - V1 query : `Practitioner?qualification-code=26&active=true&_lastUpdated=ge{ISO}`
 *              → 1 row par praticien dans rpps_audioprothesistes
 * - V2 query : `PractitionerRole?practitioner.qualification-code=26&active=true&_lastUpdated=ge{ISO}
 *              &_include=PractitionerRole:organization`
 *              → N rows par praticien dans rpps_practitioner_roles (1 par lieu)
 *
 * Contexte : signal Thomas Perron (Manéo Bayonne, 27/04/2026) — il exerce à
 * Bayonne depuis octobre 2024 ET récemment à Pessac, mais V1 ne capturait que
 * Pessac. La V2 capture les 2 lieux (et tous les lieux pour tous les audios).
 *
 * Organisation : la query inclut `_include=PractitionerRole:organization` pour
 * récupérer le SIRET et le nom de l'organisation dans le même Bundle (Organization
 * apparaît en `entry[]` à côté des PractitionerRole).
 *
 * Pas d'_include Practitioner : le RPPS canonique est dans `PractitionerRole.practitioner.identifier[]`
 * directement, pas besoin de re-fetcher le Practitioner.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const FHIR_API_URL = import.meta.env.RPPS_FHIR_API_URL ?? 'https://gateway.api.esante.gouv.fr/fhir/v2';
const FHIR_API_KEY =
  import.meta.env.ESANTE_API_KEY
  ?? import.meta.env.RPPS_FHIR_API_KEY
  ?? process.env.ESANTE_API_KEY;
const PROFESSION_CODE_AUDIO = '26';
const FHIR_PAGE_SIZE = 200;

// ──────────────────────────────────────────────────────────────────────
// Types FHIR PractitionerRole + Organization
// ──────────────────────────────────────────────────────────────────────

export interface FhirReference {
  reference?: string;       // ex: "Practitioner/abc-123" ou "Organization/xyz-456"
  type?: string;
  identifier?: { system?: string; value?: string };
  display?: string;
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
  type?: { coding?: Array<{ system?: string; code?: string }> };
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
}

export interface FhirPeriod {
  start?: string;  // YYYY-MM-DD
  end?: string;
}

export interface FhirOrganization {
  resourceType: 'Organization';
  id?: string;
  identifier?: FhirIdentifier[];
  name?: string;
  alias?: string[];
  active?: boolean;
  address?: FhirAddress[];
  telecom?: FhirContactPoint[];
}

export interface FhirPractitionerRole {
  resourceType: 'PractitionerRole';
  id?: string;
  active?: boolean;
  identifier?: FhirIdentifier[];
  practitioner?: FhirReference;
  organization?: FhirReference;
  period?: FhirPeriod;
  address?: FhirAddress[];        // parfois présent au niveau du role
  telecom?: FhirContactPoint[];
}

export interface FhirBundleLink {
  relation: string;
  url: string;
}

export interface FhirBundleEntry {
  resource?: FhirPractitionerRole | FhirOrganization;
  fullUrl?: string;
  search?: { mode?: 'match' | 'include' };
}

export interface FhirBundle {
  resourceType: 'Bundle';
  total?: number;
  entry?: FhirBundleEntry[];
  link?: FhirBundleLink[];
}

// ──────────────────────────────────────────────────────────────────────
// Types DB
// ──────────────────────────────────────────────────────────────────────

export interface PractitionerRoleRow {
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
  pays: string | null;
  departement_code: string | null;
  telephone: string | null;
  email: string | null;
  active: boolean;
  period_start: string | null;
  period_end: string | null;
}

export interface RolesSyncResult {
  pagesFetched: number;
  rolesProcessed: number;
  rolesUpserted: number;
  rolesSkippedNoRpps: number;
  organizationsResolved: number;
  durationSeconds: number;
}

// ──────────────────────────────────────────────────────────────────────
// FHIR fetch
// ──────────────────────────────────────────────────────────────────────

async function fetchFhirBundle(url: string): Promise<FhirBundle> {
  if (!FHIR_API_KEY) {
    throw new Error('ESANTE_API_KEY is not defined');
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
    throw new Error(`FHIR API error ${response.status} on ${url}: ${body.substring(0, 300)}`);
  }
  const json = (await response.json()) as FhirBundle;
  if (json.resourceType !== 'Bundle') {
    throw new Error(`Expected FHIR Bundle, got ${(json as { resourceType?: string }).resourceType}`);
  }
  return json;
}

/**
 * Itère sur les PractitionerRole code 26 avec organization included.
 * Yield des objets `{ role, organization | undefined }` — l'organization
 * vient du même Bundle quand `_include=PractitionerRole:organization`.
 */
export async function* iterPractitionerRoles(
  sinceIso: string | null,
): AsyncGenerator<{ role: FhirPractitionerRole; organization: FhirOrganization | undefined }> {
  const params = new URLSearchParams({
    'practitioner.qualification-code': PROFESSION_CODE_AUDIO,
    active: 'true',
    _include: 'PractitionerRole:organization',
    _count: String(FHIR_PAGE_SIZE),
  });
  if (sinceIso) {
    params.set('_lastUpdated', `ge${sinceIso}`);
  }
  let nextUrl: string | null = `${FHIR_API_URL}/PractitionerRole?${params.toString()}`;

  let pageCount = 0;
  while (nextUrl) {
    pageCount += 1;
    const bundle = await fetchFhirBundle(nextUrl);

    // Bundle contient à la fois les PractitionerRole et les Organization (search.mode='match' vs 'include')
    const orgs = new Map<string, FhirOrganization>();
    const roles: FhirPractitionerRole[] = [];
    for (const entry of bundle.entry ?? []) {
      const r = entry.resource;
      if (!r) continue;
      if (r.resourceType === 'Organization' && r.id) {
        orgs.set(r.id, r);
      } else if (r.resourceType === 'PractitionerRole') {
        roles.push(r);
      }
    }

    for (const role of roles) {
      const orgId = extractIdFromReference(role.organization?.reference);
      const organization = orgId ? orgs.get(orgId) : undefined;
      yield { role, organization };
    }

    const next = bundle.link?.find((l) => l.relation === 'next');
    nextUrl = next?.url ?? null;
    if (pageCount > 200) {
      throw new Error(`FHIR pagination exceeded 200 pages, aborting`);
    }
  }
}

function extractIdFromReference(ref: string | undefined): string | null {
  if (!ref) return null;
  // ref format : "Organization/xyz-123" ou "https://.../Organization/xyz-123"
  const match = ref.match(/(?:Organization|Practitioner)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

// ──────────────────────────────────────────────────────────────────────
// Parse role + organization → PractitionerRoleRow
// ──────────────────────────────────────────────────────────────────────

function normalizeRpps(value: string): string | null {
  const cleaned = value.trim();
  if (/^\d{11}$/.test(cleaned)) return cleaned;
  if (/^8\d{11}$/.test(cleaned)) return cleaned.substring(1);
  return null;
}

function extractRppsFromRole(role: FhirPractitionerRole): string | null {
  // Le RPPS du praticien peut être :
  // 1. Sur role.practitioner.identifier (si la référence porte aussi un identifier)
  // 2. Sur role.identifier[] (parfois le RPPS du praticien y figure)
  if (role.practitioner?.identifier?.value) {
    const norm = normalizeRpps(role.practitioner.identifier.value);
    if (norm) return norm;
  }
  for (const id of role.identifier ?? []) {
    if (id.value) {
      const norm = normalizeRpps(id.value);
      if (norm) return norm;
    }
  }
  // Fallback : extraire depuis role.practitioner.reference si elle contient un identifier
  // (FHIR permet ref="Practitioner/abc?identifier=...")
  return null;
}

function extractSiret(org: FhirOrganization | undefined): string | null {
  if (!org) return null;
  for (const id of org.identifier ?? []) {
    const sys = (id.system ?? '').toLowerCase();
    if (sys.includes('siret') && id.value) {
      // SIRET = 14 chiffres
      const cleaned = id.value.replace(/\D/g, '');
      if (cleaned.length === 14) return cleaned;
    }
  }
  // Fallback : tout identifier 14-digits
  for (const id of org.identifier ?? []) {
    if (id.value) {
      const cleaned = id.value.replace(/\D/g, '');
      if (cleaned.length === 14) return cleaned;
    }
  }
  return null;
}

function extractTelecom(
  source: FhirPractitionerRole | FhirOrganization,
  system: 'phone' | 'email',
): string | null {
  for (const t of source.telecom ?? []) {
    if (t.system === system && t.value) return t.value;
  }
  return null;
}

function splitAddressLine(line: string | undefined): { numVoie: string | null; typeVoie: string | null; voie: string | null } {
  if (!line) return { numVoie: null, typeVoie: null, voie: null };
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s+([A-ZÉÈÊÀÂÔÎÏÇa-zéèêàâôîïç-]+)\s+(.+)$/);
  if (match) return { numVoie: match[1].trim(), typeVoie: match[2].trim(), voie: match[3].trim() };
  return { numVoie: null, typeVoie: null, voie: trimmed };
}

function departementFromCp(cp: string | null): string | null {
  if (!cp) return null;
  const clean = cp.trim();
  if (clean.startsWith('97') || clean.startsWith('98')) return clean.substring(0, 3);
  return clean.substring(0, 2);
}

export function parseRoleRow(
  role: FhirPractitionerRole,
  organization: FhirOrganization | undefined,
): PractitionerRoleRow | null {
  const rpps = extractRppsFromRole(role);
  if (!rpps || !role.id) return null;

  // Adresse : prio role.address[0], fallback organization.address[0]
  const address = role.address?.[0] ?? organization?.address?.[0];
  const split = splitAddressLine(address?.line?.[0]);

  // Telecom : prio role, fallback org
  const phone = extractTelecom(role, 'phone') ?? (organization ? extractTelecom(organization, 'phone') : null);
  const email = extractTelecom(role, 'email') ?? (organization ? extractTelecom(organization, 'email') : null);

  return {
    rpps,
    role_id: role.id,
    siret: extractSiret(organization),
    raison_sociale: organization?.name ?? null,
    enseigne: organization?.alias?.[0] ?? null,
    num_voie: split.numVoie,
    type_voie: split.typeVoie,
    voie: split.voie,
    code_postal: address?.postalCode ?? null,
    commune: address?.city ?? null,
    pays: address?.country ?? 'FR',
    departement_code: departementFromCp(address?.postalCode ?? null),
    telephone: phone,
    email,
    active: role.active !== false, // default true
    period_start: role.period?.start ?? null,
    period_end: role.period?.end ?? null,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Run sync (orchestrateur)
// ──────────────────────────────────────────────────────────────────────

const TRACKING_KEYS = new Set(['rpps', 'role_id', 'updated_at', 'last_seen_at', 'etat_role', 'active']);
function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (TRACKING_KEYS.has(k)) { out[k] = v; continue; }
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    out[k] = v;
  }
  return out;
}

export interface RunRolesSyncOptions {
  /**
   * `incremental` (défaut) : `_lastUpdated=ge{MAX(last_seen_at) - 1h}`. Première
   * run (table vide) : full pull (sinceIso=null).
   * `full` : pull complet, ignore le filtre incrémental. Recommandé manuellement
   * 1×/trimestre pour rattraper les rôles qui auraient échappé à l'incrémental.
   */
  mode?: 'incremental' | 'full';
  /** Override explicite de la borne. Prioritaire sur `mode`. */
  sinceIso?: string | null;
}

const ROLES_INITIAL_LOOKBACK_DAYS = 7;

/**
 * Calcule la borne `sinceIso` pour le pull incrémental V2.
 * Lit `MAX(last_seen_at)` depuis `rpps_practitioner_roles` :
 * - Si table vide (première run V2) → today - 7 jours (cohérent avec V1)
 * - Sinon → MAX(last_seen_at) - 1h (overlap pour ne rien rater)
 */
async function resolveRolesSinceIso(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from('rpps_practitioner_roles')
    .select('last_seen_at')
    .order('last_seen_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.last_seen_at) {
    const fallback = new Date();
    fallback.setUTCDate(fallback.getUTCDate() - ROLES_INITIAL_LOOKBACK_DAYS);
    return fallback.toISOString();
  }
  const last = new Date(data.last_seen_at as string);
  last.setUTCHours(last.getUTCHours() - 1);
  return last.toISOString();
}

export async function runRolesSync(
  supabase: SupabaseClient,
  opts: RunRolesSyncOptions = {},
): Promise<RolesSyncResult> {
  const startedAt = Date.now();
  const mode = opts.mode ?? 'incremental';
  const sinceIso = opts.sinceIso !== undefined
    ? opts.sinceIso
    : mode === 'full'
      ? null
      : await resolveRolesSinceIso(supabase);

  let rolesProcessed = 0;
  let rolesUpserted = 0;
  let rolesSkippedNoRpps = 0;
  let organizationsResolved = 0;
  let pagesFetched = 0;

  const BATCH_SIZE = 100;
  let batch: PractitionerRoleRow[] = [];

  const flushBatch = async (): Promise<void> => {
    if (batch.length === 0) return;
    const rowsToWrite = batch.map((r) => stripEmpty({
      ...r,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      etat_role: 'actif' as const,
    }));
    const { error } = await supabase
      .from('rpps_practitioner_roles')
      .upsert(rowsToWrite, { onConflict: 'rpps,role_id' });
    if (error) {
      throw new Error(`Failed to upsert roles batch (size ${batch.length}): ${error.message}`);
    }
    rolesUpserted += batch.length;
    batch = [];
  };

  for await (const { role, organization } of iterPractitionerRoles(sinceIso)) {
    rolesProcessed += 1;
    if (organization) organizationsResolved += 1;
    const row = parseRoleRow(role, organization);
    if (!row) {
      rolesSkippedNoRpps += 1;
      continue;
    }
    batch.push(row);
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  // Track pagesFetched approximativement (pas exposé par le generator, on l'estime via rolesProcessed)
  pagesFetched = Math.ceil(rolesProcessed / FHIR_PAGE_SIZE);

  const durationSeconds = Math.round((Date.now() - startedAt) / 1000);
  return {
    pagesFetched,
    rolesProcessed,
    rolesUpserted,
    rolesSkippedNoRpps,
    organizationsResolved,
    durationSeconds,
  };
}
