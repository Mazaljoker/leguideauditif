#!/usr/bin/env node
/**
 * Generate deserts-auditifs-2026.json
 * Crosses RPPS audioprothesistes (Supabase) with INSEE population data.
 *
 * Usage: node --env-file=.env scripts/generate-deserts-data.mjs
 *
 * IMPORTANT: Only fetches non-nominative columns (code_postal, mode_exercice, enseigne).
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ─── Supabase ───────────────────────────────────────────────
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Code postal → département ──────────────────────────────
function codePostalToDepartement(cp) {
  if (!cp || cp.length < 2) return null;
  const prefix2 = cp.slice(0, 2);
  const prefix3 = cp.slice(0, 3);

  // DOM-TOM: 97x and 98x
  if (prefix2 === '97' || prefix2 === '98') {
    return prefix3;
  }

  // Corse: 20xxx → 2A (Corse-du-Sud) or 2B (Haute-Corse)
  if (prefix2 === '20') {
    const num = parseInt(cp, 10);
    // 20000-20190 = 2A, 20200+ = 2B
    return num < 20200 ? '2A' : '2B';
  }

  return prefix2;
}

// ─── Fetch RPPS data (paginated) ────────────────────────────
async function fetchRPPS() {
  const PAGE_SIZE = 1000;
  let all = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('rpps_audioprothesistes')
      .select('code_postal, mode_exercice, enseigne')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Supabase error:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      all = all.concat(data);
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${all.length} audioprothesistes from RPPS`);
  return all;
}

// ─── Main ───────────────────────────────────────────────────
async function main() {
  // 1. Load INSEE data
  const inseeData = JSON.parse(
    readFileSync(join(ROOT, 'src/data/insee-population-departements-2025.json'), 'utf8')
  );
  console.log(`Loaded INSEE data: ${Object.keys(inseeData).length} departements`);

  // 2. Fetch RPPS
  const rpps = await fetchRPPS();
  const totalRPPS = rpps.length;

  // 3. Aggregate by department
  const deptCounts = {};
  let withAddress = 0;
  let withoutAddress = 0;

  for (const row of rpps) {
    const dept = codePostalToDepartement(row.code_postal);
    if (!dept) {
      withoutAddress++;
      continue;
    }
    withAddress++;

    if (!deptCounts[dept]) {
      deptCounts[dept] = { audios: 0, enseignes: new Set(), liberal: 0, salarie: 0 };
    }
    deptCounts[dept].audios++;
    if (row.enseigne) deptCounts[dept].enseignes.add(row.enseigne);
    if (row.mode_exercice === 'L') deptCounts[dept].liberal++;
    else if (row.mode_exercice === 'S') deptCounts[dept].salarie++;
    // 'B' (both) counts in neither specifically
  }

  console.log(`With address: ${withAddress}, Without: ${withoutAddress}`);

  // 4. Build department array
  const departements = [];
  const niveauSeuils = (ratio) => {
    if (ratio >= 10) return 'vert';
    if (ratio >= 7) return 'jaune';
    if (ratio >= 5) return 'orange';
    return 'rouge';
  };

  for (const [code, insee] of Object.entries(inseeData)) {
    const counts = deptCounts[code] || { audios: 0, enseignes: new Set(), liberal: 0, salarie: 0 };
    const ratio = insee.population_totale > 0
      ? Math.round((counts.audios / insee.population_totale) * 100000 * 100) / 100
      : 0;

    departements.push({
      code,
      nom: insee.nom.trim(),
      audios: counts.audios,
      population_totale: insee.population_totale,
      population_60plus: insee.population_60plus,
      ratio_100k: ratio,
      niveau: niveauSeuils(ratio),
    });
  }

  // 5. Sort by ratio and assign ranks
  departements.sort((a, b) => a.ratio_100k - b.ratio_100k);
  departements.forEach((d, i) => { d.rang = i + 1; });

  // 6. Compute national average
  const totalAudiosGeo = departements.reduce((s, d) => s + d.audios, 0);
  const totalPop = departements.reduce((s, d) => s + d.population_totale, 0);
  const moyenneNationale = Math.round((totalAudiosGeo / totalPop) * 100000 * 100) / 100;

  // 7. Build output
  const output = {
    metadata: {
      source_rpps: 'data.gouv.fr, avril 2026',
      source_insee: 'INSEE, estimation population 1er janvier 2025',
      total_audios: totalAudiosGeo,
      total_audios_rpps: totalRPPS,
      audios_sans_adresse: withoutAddress,
      moyenne_nationale: moyenneNationale,
      date_generation: '2026-04-11',
      date_publication: '2026-04-20',
    },
    departements,
  };

  // 8. Write files
  const srcPath = join(ROOT, 'src/data/deserts-auditifs-2026.json');
  const publicPath = join(ROOT, 'public/data/deserts-auditifs-2026.json');
  writeFileSync(srcPath, JSON.stringify(output, null, 2), 'utf8');
  copyFileSync(srcPath, publicPath);

  console.log(`\nGenerated: ${srcPath}`);
  console.log(`Copied to: ${publicPath}`);
  console.log(`\n--- Stats ---`);
  console.log(`Total RPPS: ${totalRPPS}`);
  console.log(`Geolocated: ${totalAudiosGeo}`);
  console.log(`Sans adresse: ${withoutAddress}`);
  console.log(`Moyenne nationale: ${moyenneNationale} / 100k hab.`);
  console.log(`Pire: ${departements[0].nom} (${departements[0].ratio_100k})`);
  console.log(`Meilleur: ${departements[departements.length - 1].nom} (${departements[departements.length - 1].ratio_100k})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
