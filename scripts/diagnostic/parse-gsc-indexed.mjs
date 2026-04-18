#!/usr/bin/env node
/**
 * Diagnostic indexation — analyse des URLs indexées GSC
 *
 * Output : console (tableaux markdown) + JSON stats
 *
 * Usage :
 *   node scripts/diagnostic/parse-gsc-indexed.mjs
 *   node scripts/diagnostic/parse-gsc-indexed.mjs \
 *     --input docs/data/gsc-urls-indexees-J14.csv \
 *     --output docs/data/diagnostic-stats-J14.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function argValue(flag, fallback) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const INPUT = resolve(argValue('--input', 'docs/data/gsc-urls-indexees-97.csv'));
const OUTPUT = resolve(argValue('--output', 'docs/data/diagnostic-stats.json'));

const ENSEIGNES = [
  'audika', 'amplifon', 'afflelou', 'acuitis', 'audilab',
  'audio 2000', 'audio-2000', 'optical center', 'optical-center',
  'krys', 'atol', 'optic 2000', 'optic-2000', 'ecouter voir', 'ecouter-voir',
  'entendre', 'grandaudition', 'audition conseil', 'audition-conseil',
  'alfa optique', 'alfa-optique', 'asteric optic', 'asteric-optic',
  'mutualit', 'audition sant', 'audition-sant',
];

const DEPT_NAMES = {
  '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche', '08': 'Ardennes',
  '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron',
  '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal', '16': 'Charente',
  '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '21': 'Côte-d\'Or',
  '22': 'Côtes-d\'Armor', '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs',
  '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
  '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde',
  '34': 'Hérault', '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire',
  '38': 'Isère', '39': 'Jura', '40': 'Landes', '41': 'Loir-et-Cher',
  '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique', '45': 'Loiret',
  '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire',
  '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne',
  '54': 'Meurthe-et-Moselle', '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle',
  '58': 'Nièvre', '59': 'Nord', '60': 'Oise', '61': 'Orne', '62': 'Pas-de-Calais',
  '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées',
  '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin', '68': 'Haut-Rhin', '69': 'Rhône',
  '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie',
  '74': 'Haute-Savoie', '75': 'Paris', '76': 'Seine-Maritime', '77': 'Seine-et-Marne',
  '78': 'Yvelines', '79': 'Deux-Sèvres', '80': 'Somme', '81': 'Tarn',
  '82': 'Tarn-et-Garonne', '83': 'Var', '84': 'Vaucluse', '85': 'Vendée',
  '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne',
  '90': 'Territoire de Belfort', '91': 'Essonne', '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne', '95': 'Val-d\'Oise',
};

function parseCsv(raw) {
  const lines = raw.trim().split('\n').slice(1);
  return lines.map((line) => {
    const [url, lastCrawl] = line.split(',');
    return { url: url.trim(), lastCrawl: lastCrawl?.trim() };
  });
}

function classifyUrl(url) {
  const u = url.replace(/^https?:\/\/(www\.)?leguideauditif\.fr/, '');
  if (u.startsWith('/centre/')) return 'centre';
  if (u.startsWith('/catalogue/appareils/')) return 'catalogue-appareil';
  if (u.startsWith('/catalogue/marques/')) return 'catalogue-marque';
  if (u.startsWith('/catalogue/types/')) return 'catalogue-type';
  if (u === '/catalogue/comparer/') return 'catalogue-comparer';
  if (u.startsWith('/guides/')) return 'guide';
  if (u.startsWith('/comparatifs/')) return 'comparatif';
  if (u.startsWith('/annonces/')) return 'annonce';
  if (u === '/') return 'home';
  return 'utilitaire';
}

function extractCp(slug) {
  // Format slug centre : [nom]-[cp5]-[ville-slug] ou [nom]-[cp5]
  // Cherche 5 chiffres consécutifs
  const match = slug.match(/(?:^|-)(\d{5})(?:-|$)/);
  return match ? match[1] : null;
}

function cpToDept(cp) {
  if (!cp) return null;
  if (cp.startsWith('97') || cp.startsWith('98')) return cp.substring(0, 3);
  if (cp.startsWith('20')) return '2A/2B'; // Corse — heuristique
  return cp.substring(0, 2);
}

function isEnseigne(slug) {
  const lower = slug.toLowerCase();
  return ENSEIGNES.some((e) => lower.includes(e));
}

function detectEnseigne(slug) {
  const lower = slug.toLowerCase();
  for (const e of ENSEIGNES) {
    if (lower.includes(e)) return e;
  }
  return 'indépendant';
}

function isWwwVariant(url) {
  return url.includes('://www.leguideauditif.fr');
}

function extractCentreSlug(url) {
  const m = url.match(/\/centre\/([^/]+)\/?$/);
  return m ? m[1] : null;
}

function firstLetter(slug) {
  const c = slug[0].toLowerCase();
  return /[a-z]/.test(c) ? c : '?';
}

// === MAIN ===
const raw = readFileSync(INPUT, 'utf8');
const rows = parseCsv(raw);

const byType = {};
const centres = [];
const wwwUrls = [];

for (const row of rows) {
  const type = classifyUrl(row.url);
  byType[type] = (byType[type] || 0) + 1;
  if (isWwwVariant(row.url)) wwwUrls.push(row.url);
  if (type === 'centre') {
    const slug = extractCentreSlug(row.url);
    const cp = extractCp(slug || '');
    const dept = cpToDept(cp);
    centres.push({
      url: row.url,
      slug,
      cp,
      dept,
      deptName: dept ? DEPT_NAMES[dept] || dept : null,
      enseigne: detectEnseigne(slug || ''),
      isEnseigne: isEnseigne(slug || ''),
      firstLetter: firstLetter(slug || ''),
      lastCrawl: row.lastCrawl,
    });
  }
}

// Distribution par département (top)
const byDept = {};
for (const c of centres) {
  const key = c.dept ? `${c.dept} ${c.deptName || ''}`.trim() : 'inconnu';
  byDept[key] = (byDept[key] || 0) + 1;
}
const deptRanking = Object.entries(byDept).sort((a, b) => b[1] - a[1]);

// Distribution par première lettre du slug
const byFirst = {};
for (const c of centres) {
  byFirst[c.firstLetter] = (byFirst[c.firstLetter] || 0) + 1;
}
const firstRanking = Object.entries(byFirst).sort((a, b) => b[1] - a[1]);

// Enseigne vs indépendant
const nbEnseigne = centres.filter((c) => c.isEnseigne).length;
const nbIndep = centres.length - nbEnseigne;
const byEnseigne = {};
for (const c of centres) {
  byEnseigne[c.enseigne] = (byEnseigne[c.enseigne] || 0) + 1;
}

// Distribution par date de crawl
const byDate = {};
for (const c of centres) {
  byDate[c.lastCrawl || 'unknown'] = (byDate[c.lastCrawl || 'unknown'] || 0) + 1;
}

// === RAPPORT CONSOLE ===
console.log('\n=== DIAGNOSTIC INDEXATION GSC — 18/04/2026 ===\n');
console.log('Total URLs indexées :', rows.length);
console.log('\n--- Répartition par type de page ---');
for (const [type, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(22)} : ${n}`);
}

console.log('\n--- Fiches centres : distribution par département ---');
console.log(`Total centres indexés : ${centres.length}`);
console.log(`Départements distincts : ${Object.keys(byDept).length}`);
console.log('Top 10 départements :');
for (const [dept, n] of deptRanking.slice(0, 10)) {
  console.log(`  ${dept.padEnd(30)} : ${n}`);
}

console.log('\n--- Fiches centres : 1ère lettre du slug (indicateur chronologique) ---');
for (const [letter, n] of firstRanking) {
  console.log(`  ${letter} : ${n} (${((n / centres.length) * 100).toFixed(1)}%)`);
}

console.log('\n--- Fiches centres : enseigne vs indépendant ---');
console.log(`  Enseignes nationales : ${nbEnseigne} (${((nbEnseigne / centres.length) * 100).toFixed(1)}%)`);
console.log(`  Indépendants         : ${nbIndep} (${((nbIndep / centres.length) * 100).toFixed(1)}%)`);
console.log('\nDétail enseignes :');
for (const [e, n] of Object.entries(byEnseigne).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${e.padEnd(22)} : ${n}`);
}

console.log('\n--- Fiches centres : date dernière exploration ---');
for (const [date, n] of Object.entries(byDate).sort()) {
  console.log(`  ${date} : ${n}`);
}

console.log('\n--- URLs www résiduelles (problème canonique) ---');
console.log(`Total : ${wwwUrls.length}`);
for (const u of wwwUrls) console.log(`  ${u}`);

// === JSON OUTPUT ===
const stats = {
  generated_at: new Date().toISOString(),
  source: 'docs/data/gsc-urls-indexees-97.csv',
  total_urls: rows.length,
  by_type: byType,
  centres: {
    total: centres.length,
    depts_distincts: Object.keys(byDept).length,
    top_depts: deptRanking.slice(0, 10),
    first_letter_distribution: firstRanking,
    enseigne_count: nbEnseigne,
    independant_count: nbIndep,
    enseigne_breakdown: byEnseigne,
    by_crawl_date: byDate,
    items: centres,
  },
  www_residuels: wwwUrls,
};

writeFileSync(OUTPUT, JSON.stringify(stats, null, 2), 'utf8');
console.log(`\nStats JSON écrites : ${OUTPUT}\n`);
