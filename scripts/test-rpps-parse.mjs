/**
 * Test ad-hoc du parsing FHIR Practitioner → RppsRow.
 *
 * Pas de framework de test installé ici — ce script ré-implémente la logique
 * de `src/lib/rpps-sync.ts:parsePractitioner` en pur JS pour la valider sur
 * la fixture `tests/fixtures/rpps-fhir-bundle.json`.
 *
 * Pour des vrais tests unitaires (idempotence, marquage inactif, mock Resend),
 * il faudrait installer vitest — phase ultérieure si nécessaire.
 *
 * Usage : node scripts/test-rpps-parse.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, '../tests/fixtures/rpps-fhir-bundle.json');

// ─── Réimplémentation 1:1 du parsing dans rpps-sync.ts ───
// Si le module TS change, ce script doit être resynchronisé manuellement.

function normalizeRpps(value) {
  const cleaned = value.trim();
  if (/^\d{11}$/.test(cleaned)) return cleaned;
  if (/^8\d{11}$/.test(cleaned)) return cleaned.substring(1); // IDNPS audio → RPPS
  return null;
}

function extractRpps(p) {
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

function extractTelecom(p, system) {
  for (const t of p.telecom ?? []) if (t.system === system && t.value) return t.value;
  return null;
}

function splitAddressLine(line) {
  if (!line) return { numVoie: null, typeVoie: null, voie: null };
  const trimmed = line.trim();
  const match = trimmed.match(/^(\d+\s*(?:BIS|TER|QUATER)?)\s+([A-ZÉÈÊÀÂÔÎÏÇa-zéèêàâôîïç-]+)\s+(.+)$/);
  if (match) return { numVoie: match[1].trim(), typeVoie: match[2].trim(), voie: match[3].trim() };
  return { numVoie: null, typeVoie: null, voie: trimmed };
}

function departementFromCp(cp) {
  if (!cp) return null;
  const clean = cp.trim();
  if (clean.startsWith('97') || clean.startsWith('98')) return clean.substring(0, 3);
  return clean.substring(0, 2);
}

function parsePractitioner(p) {
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
    code_postal: address?.postalCode ?? null,
    commune: address?.city ?? null,
    pays: address?.country ?? 'FR',
    telephone: extractTelecom(p, 'phone'),
    email: extractTelecom(p, 'email'),
    departement_code: departementFromCp(address?.postalCode ?? null),
    num_voie: split.numVoie,
    type_voie: split.typeVoie,
    voie: split.voie,
  };
}

// ─── Test runner minimal ───
let passed = 0;
let failed = 0;

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}\n    expected: ${JSON.stringify(expected)}\n    got:      ${JSON.stringify(actual)}`);
  }
}

function test(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ─── Tests ───
const bundle = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));

test('Bundle structure', () => {
  assertEqual(bundle.resourceType, 'Bundle', 'resourceType is Bundle');
  assertEqual(bundle.entry.length, 4, '4 entries in bundle');
});

test('Practitioner #1 (Jean DUPONT, Bayonne, RPPS via system)', () => {
  const row = parsePractitioner(bundle.entry[0].resource);
  assertEqual(row !== null, true, 'parsing returned a row');
  assertEqual(row.rpps, '10003456789', 'rpps extracted from system=idnps');
  assertEqual(row.nom, 'DUPONT', 'family name');
  assertEqual(row.prenom, 'Jean', 'given name');
  assertEqual(row.civilite, 'M', 'civilite from prefix');
  assertEqual(row.code_postal, '64100', 'code_postal');
  assertEqual(row.commune, 'Bayonne', 'commune');
  assertEqual(row.departement_code, '64', 'departement code 64');
  assertEqual(row.telephone, '0559123456', 'phone telecom');
  assertEqual(row.email, 'j.dupont@example.fr', 'email telecom');
  assertEqual(row.num_voie, '12', 'num_voie split');
  assertEqual(row.type_voie, 'RUE', 'type_voie split');
  assertEqual(row.voie, 'DU MARCHE', 'voie split');
});

test('Practitioner #2 (Marie Claire MARTIN, Paris 75015, RPPS via 11-digit fallback)', () => {
  const row = parsePractitioner(bundle.entry[1].resource);
  assertEqual(row !== null, true, 'parsing returned a row');
  assertEqual(row.rpps, '10009876543', 'rpps extracted via 11-digit fallback');
  assertEqual(row.nom, 'MARTIN', 'family name');
  assertEqual(row.prenom, 'Marie Claire', 'given names joined');
  assertEqual(row.code_postal, '75015', 'code_postal Paris');
  assertEqual(row.departement_code, '75', 'departement 75');
  assertEqual(row.num_voie, '5 BIS', 'num_voie with BIS');
  assertEqual(row.type_voie, 'AVENUE', 'type_voie AVENUE');
});

test('Practitioner #3 (no identifier) → returns null', () => {
  const row = parsePractitioner(bundle.entry[2].resource);
  assertEqual(row, null, 'no RPPS identifier → null');
});

test('Practitioner #4 (IDNPS 12 digits via system=idnps) → normalised to RPPS 11 digits', () => {
  const row = parsePractitioner(bundle.entry[3].resource);
  assertEqual(row !== null, true, 'parsing returned a row');
  assertEqual(row.rpps, '10002460995', 'IDNPS 810002460995 normalisé en RPPS 10002460995 (strip prefix 8)');
  assertEqual(row.nom, 'HEILIG', 'family name');
  assertEqual(row.prenom, 'CELINE', 'given name');
});

test('normalizeRpps direct unit tests', () => {
  assertEqual(normalizeRpps('10002460995'), '10002460995', 'RPPS 11 digits → no-op');
  assertEqual(normalizeRpps('810002460995'), '10002460995', 'IDNPS 12 digits préfixe 8 → strip');
  assertEqual(normalizeRpps('1234'), null, 'too short → null');
  assertEqual(normalizeRpps('123456789012'), null, '12 digits NOT prefixed by 8 → null (pas un IDNPS audio)');
  assertEqual(normalizeRpps(''), null, 'empty → null');
});

test('departementFromCp DOM/TOM', () => {
  assertEqual(departementFromCp('97400'), '974', 'Réunion 974');
  assertEqual(departementFromCp('98800'), '988', 'Nouvelle-Calédonie 988');
  assertEqual(departementFromCp('11000'), '11', 'Aude 11');
  assertEqual(departementFromCp(null), null, 'null cp');
  assertEqual(departementFromCp(''), null, 'empty cp');
});

console.log(`\n──────────────────────────────────────`);
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
