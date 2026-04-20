/**
 * Split des redirects du ré-import franchises entre vercel.json (top) et
 * Supabase centre_redirects (reste).
 *
 * Stratégie :
 *   - vercel.json : 1000 redirects max (limite Vercel 1024), priorisés
 *     alphabétiquement sur old_slug (déterministe, reproductible)
 *   - Supabase centre_redirects : le reste
 *   - Middleware + [slug].astro (déjà modifiés) consultent Supabase en fallback
 *
 * Usage :
 *   node scripts/split-redirects-hybride.mjs                 # dry-run
 *   node scripts/split-redirects-hybride.mjs --apply         # écrit vercel.json + Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APPLY = process.argv.includes('--apply');

const REDIRECTS_INPUT = 'reports/reimport-redirects.json';
const VERCEL_JSON = 'vercel.json';
const VERCEL_JSON_MAX_REDIRECTS_TOTAL = 1024;
const REDIRECTS_FROM_REIMPORT_MAX = 1000;

function loadRedirects() {
  if (!existsSync(REDIRECTS_INPUT)) {
    console.error(`Fichier introuvable : ${REDIRECTS_INPUT}`);
    console.error('Lancer d\'abord scripts/reimport-franchises-from-insee.mjs pour le générer.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(REDIRECTS_INPUT, 'utf-8'));
}

function loadVercelJson() {
  return JSON.parse(readFileSync(VERCEL_JSON, 'utf-8'));
}

async function main() {
  console.log('=== Split redirects hybride ===');
  console.log(`Mode : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('---');

  const redirects = loadRedirects();
  console.log(`Redirects reimport  : ${redirects.length}`);

  // Tri déterministe par old_slug
  const sorted = [...redirects].sort((a, b) => a.old.localeCompare(b.old));

  const topForVercel = sorted.slice(0, REDIRECTS_FROM_REIMPORT_MAX);
  const restForSupabase = sorted.slice(REDIRECTS_FROM_REIMPORT_MAX);

  console.log(`Top vercel.json     : ${topForVercel.length}`);
  console.log(`Reste Supabase      : ${restForSupabase.length}`);
  console.log('---');

  // --- Vercel.json ---
  const vercelJson = loadVercelJson();
  const existingRedirects = vercelJson.redirects || [];
  console.log(`vercel.json existant : ${existingRedirects.length} redirects`);

  // Filtre pour éviter les doublons (si on relance)
  const existingSources = new Set(existingRedirects.map((r) => r.source));
  const newEntries = topForVercel
    .filter((r) => !existingSources.has(`/centre/${r.old}/`))
    .map((r) => ({
      source: `/centre/${r.old}/`,
      destination: `/centre/${r.new}/`,
      permanent: true,
    }));

  const finalCount = existingRedirects.length + newEntries.length;
  console.log(`Nouveaux dans vercel : ${newEntries.length}`);
  console.log(`Total après merge    : ${finalCount} (max ${VERCEL_JSON_MAX_REDIRECTS_TOTAL})`);

  if (finalCount > VERCEL_JSON_MAX_REDIRECTS_TOTAL) {
    console.error(`ERREUR : dépasse la limite Vercel (${VERCEL_JSON_MAX_REDIRECTS_TOTAL}).`);
    console.error('Réduire REDIRECTS_FROM_REIMPORT_MAX dans le script.');
    process.exit(1);
  }

  if (APPLY) {
    const updated = {
      ...vercelJson,
      redirects: [...existingRedirects, ...newEntries],
    };
    writeFileSync(VERCEL_JSON, JSON.stringify(updated, null, 2) + '\n');
    console.log(`  → vercel.json mis à jour (+${newEntries.length} redirects)`);
  } else {
    console.log(`  [DRY-RUN] vercel.json non modifié.`);
    if (newEntries.length > 0) {
      console.log(`  Exemple :`);
      console.log(`    ${JSON.stringify(newEntries[0])}`);
    }
  }

  // --- Supabase centre_redirects ---
  console.log('---');
  console.log(`Insertion Supabase centre_redirects…`);

  if (APPLY) {
    // Upsert par batch de 500
    const BATCH = 500;
    let inserted = 0;
    for (let i = 0; i < restForSupabase.length; i += BATCH) {
      const chunk = restForSupabase.slice(i, i + BATCH).map((r) => ({
        old_slug: r.old,
        new_slug: r.new,
        reason: 'reimport-franchises-insee-2026-04',
      }));
      const { error } = await supabase
        .from('centre_redirects')
        .upsert(chunk, { onConflict: 'old_slug' });
      if (error) {
        console.error(`  ERREUR batch ${i / BATCH + 1} : ${error.message}`);
        process.exit(1);
      }
      inserted += chunk.length;
      console.log(`  batch ${Math.ceil((i + BATCH) / BATCH)} : ${inserted}/${restForSupabase.length}`);
    }
    console.log(`  → ${inserted} rows upserted en centre_redirects`);
  } else {
    console.log(`  [DRY-RUN] Supabase non modifié.`);
    if (restForSupabase.length > 0) {
      console.log(`  Exemple :`);
      console.log(`    ${JSON.stringify(restForSupabase[0])}`);
    }
  }

  console.log('---');
  console.log('FAIT');
  if (!APPLY) {
    console.log('Pour appliquer : node scripts/split-redirects-hybride.mjs --apply');
  }
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
