#!/usr/bin/env node
/**
 * Re-mesure J+14 — orchestrateur one-shot.
 *
 * Adresse la Partie 2 du diagnostic 2026-04-18 : mesurer la trajectoire
 * factuellement (pas à l'intuition). Durée cible < 15 min.
 *
 * Ce que fait le script :
 *  1. Détecte le CSV J14 dans docs/data/ (nom par convention ou passé en
 *     argument)
 *  2. Relance parse-gsc-indexed.mjs en pointant sur le nouveau CSV
 *  3. Relance check-silo-mesh.sh pour vérifier que le maillage tient
 *  4. Charge le baseline JSON (J+0) et le nouveau JSON (J+14) et imprime
 *     un tableau delta
 *  5. Évalue le scénario déclenché (A / B / C) selon les seuils du plan
 *
 * Usage :
 *   node scripts/diagnostic/run-remesure.mjs
 *   node scripts/diagnostic/run-remesure.mjs \
 *     --input docs/data/gsc-urls-indexees-J14.csv \
 *     --baseline docs/data/diagnostic-stats.json
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const INPUT = argValue('--input', 'docs/data/gsc-urls-indexees-J14.csv');
const BASELINE = argValue('--baseline', 'docs/data/diagnostic-stats.json');
const OUTPUT = argValue('--output', 'docs/data/diagnostic-stats-J14.json');

const inputPath = resolve(INPUT);
const baselinePath = resolve(BASELINE);
const outputPath = resolve(OUTPUT);

if (!existsSync(inputPath)) {
  console.error(`CSV J+14 introuvable : ${inputPath}`);
  console.error('Export-le depuis GSC (Indexation → Pages → Dans l\'index → Exporter).');
  process.exit(1);
}
if (!existsSync(baselinePath)) {
  console.error(`Baseline introuvable : ${baselinePath}`);
  console.error('Lance d\'abord parse-gsc-indexed.mjs sur le CSV J+0.');
  process.exit(1);
}

console.log(`Re-mesure J+14 — input ${INPUT}`);
console.log('');

// --- Étape 1 : parsing du CSV J+14 ---
const parseRes = spawnSync(
  process.execPath,
  [
    'scripts/diagnostic/parse-gsc-indexed.mjs',
    '--input', inputPath,
    '--output', outputPath,
  ],
  { stdio: 'inherit' },
);
if (parseRes.status !== 0) {
  console.error('Le parsing a échoué, arrêt.');
  process.exit(parseRes.status || 1);
}

// --- Étape 2 : validation maillage silo ---
console.log('\n--- Validation maillage silo (échantillon) ---');
const silo = spawnSync('bash', ['scripts/diagnostic/check-silo-mesh.sh'], {
  stdio: 'inherit',
});
if (silo.status !== 0) {
  console.warn('check-silo-mesh.sh a retourné un code non-zéro — voir sortie ci-dessus.');
}

// --- Étape 3 : delta ---
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const now = JSON.parse(readFileSync(outputPath, 'utf8'));

const metrics = [
  { label: 'URLs totales indexées', b: baseline.total_urls, n: now.total_urls },
  { label: 'Fiches /centre/* indexées', b: baseline.centres.total, n: now.centres.total },
  { label: 'Départements distincts (centres)', b: baseline.centres.depts_distincts, n: now.centres.depts_distincts },
  { label: '% fiches lettre "a"', b: pctFirst(baseline, 'a'), n: pctFirst(now, 'a') },
  { label: 'URLs www résiduelles', b: baseline.www_residuels?.length ?? 0, n: now.www_residuels?.length ?? 0 },
];

console.log('\n--- Delta métriques J+0 → J+14 ---\n');
console.log('| Métrique | J+0 | J+14 | Delta |');
console.log('|---|---|---|---|');
for (const m of metrics) {
  const d = typeof m.b === 'number' && typeof m.n === 'number' ? m.n - m.b : 'n/a';
  const dStr = typeof d === 'number' ? (d >= 0 ? `+${d}` : `${d}`) : d;
  console.log(`| ${m.label} | ${fmt(m.b)} | ${fmt(m.n)} | ${dStr} |`);
}

// --- Étape 4 : évaluation du scénario ---
console.log('\n--- Scénario déclenché ---\n');
const total = now.total_urls;
const pctA = pctFirst(now, 'a');
const nbCentres = now.centres.total;

// NB : le critère "pages villes/dépts indexées" nécessite que le CSV
// contienne ces URLs. On approxime via total_urls - centres - autres.
// Le signal qualitatif principal est le % 'a' qui doit BAISSER.

if (total < 150 || (total > 150 && pctA >= 95)) {
  console.log('>>> Scénario C — Stagnation réelle');
  console.log('    Critère : URLs < 150 OU % "a" toujours >= 95 (= Google ne progresse pas dans l\'alphabet)');
  console.log('    Décision : diagnostic Partie 1 invalidé, ouvrir chantier enrichissement Level 1');
} else if (total > 300 && pctA < 80) {
  console.log('>>> Scénario A — Trajectoire confirmée');
  console.log('    Critère : URLs > 300 ET % "a" < 80');
  console.log('    Décision : poursuivre, scaler avec les 6146 fiches manquantes par vagues de 1000');
  console.log('    Re-mesure : J+30 (16 mai)');
} else {
  console.log('>>> Scénario B — Progression partielle');
  console.log('    Critère : 150-300 URLs OU progression alpha partielle');
  console.log('    Décision : attendre 2 semaines, aucune action offensive');
  console.log('    Re-mesure : J+28 (14 mai)');
}

console.log(`\nDelta centres /a/ → autres lettres : ${pctA.toFixed(1)}% (seuil Scénario A : < 80%)`);

// --- Helpers ---
function pctFirst(stats, letter) {
  const total = stats.centres?.total || 0;
  if (total === 0) return 0;
  const entry = (stats.centres?.first_letter_distribution || []).find((e) => e[0] === letter);
  return entry ? (entry[1] / total) * 100 : 0;
}

function fmt(v) {
  if (typeof v === 'number') return v.toFixed(v % 1 === 0 ? 0 : 1);
  return v ?? '—';
}
