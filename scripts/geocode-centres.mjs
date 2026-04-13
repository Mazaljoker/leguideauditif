/**
 * Geocodage des centres sans coordonnees GPS
 * Utilise l'API adresse.data.gouv.fr (gratuite, illimitee)
 * Supporte le geocodage en batch (CSV) pour aller vite
 *
 * Usage:
 *   node scripts/geocode-centres.mjs              # geocoder tout
 *   node scripts/geocode-centres.mjs --dry-run    # test sans ecriture
 *   node scripts/geocode-centres.mjs --all        # re-geocoder meme ceux avec GPS
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_KEY manquante.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');
const ALL = process.argv.includes('--all');

// --- API adresse.data.gouv.fr en batch CSV ---
// Endpoint : POST /search/csv/ avec un fichier CSV
// Limite : 50 lignes par requete en batch, pas de rate limit strict
const BATCH_SIZE = 50;
const DELAY_MS = 300; // courtoisie

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function geocodeBatch(centres) {
  // Construire un CSV avec colonnes: id, adresse, cp, ville
  const header = 'id,adresse,postcode,city';
  const rows = centres.map(c => {
    const adresse = (c.adresse || '').replace(/"/g, '""');
    const ville = (c.ville || '').replace(/"/g, '""');
    const cp = (c.cp || '').replace(/"/g, '""');
    return `"${c.id}","${adresse}","${cp}","${ville}"`;
  });
  const csv = [header, ...rows].join('\n');

  const formData = new FormData();
  formData.append('data', new Blob([csv], { type: 'text/csv' }), 'centres.csv');
  formData.append('columns', 'adresse');
  formData.append('postcode', 'postcode');
  formData.append('city', 'city');

  const res = await fetch('https://api-adresse.data.gouv.fr/search/csv/', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Erreur API adresse ${res.status}: ${text.substring(0, 200)}`);
    return [];
  }

  const resultCsv = await res.text();
  return parseCsvResult(resultCsv);
}

function parseCsvResult(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  const idIdx = headers.indexOf('id');
  const latIdx = headers.indexOf('latitude');
  const lngIdx = headers.indexOf('longitude');
  const scoreIdx = headers.indexOf('result_score');
  const labelIdx = headers.indexOf('result_label');

  if (idIdx === -1 || latIdx === -1 || lngIdx === -1) {
    console.error('Colonnes manquantes dans la reponse CSV:', headers.join(', '));
    return [];
  }

  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const id = cols[idIdx];
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    const score = parseFloat(cols[scoreIdx] || '0');
    const label = cols[labelIdx] || '';

    if (id && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      results.push({ id, lat, lng, score, label });
    }
  }
  return results;
}

// Parse une ligne CSV en respectant les guillemets
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// --- Main ---
async function main() {
  console.log('=== Geocodage des centres auditifs ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  console.log(`Cible: ${ALL ? 'TOUS les centres' : 'Centres sans GPS uniquement'}`);

  // Charger les centres a geocoder (pagine)
  let allCentres = [];
  let page = 0;
  const PAGE_SIZE_DB = 1000;

  while (true) {
    let query = supabase
      .from('centres_auditifs')
      .select('id, adresse, cp, ville, lat, lng');

    if (!ALL) {
      // Uniquement ceux sans GPS
      query = query.or('lat.is.null,lng.is.null');
    }

    const { data, error } = await query.range(page * PAGE_SIZE_DB, (page + 1) * PAGE_SIZE_DB - 1);

    if (error) { console.error('Erreur:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allCentres = allCentres.concat(data);
    if (data.length < PAGE_SIZE_DB) break;
    page++;
  }

  console.log(`Centres a geocoder: ${allCentres.length}`);
  if (allCentres.length === 0) {
    console.log('Rien a faire.');
    return;
  }

  let geocoded = 0;
  let lowScore = 0;
  let failed = 0;
  let updated = 0;

  // Traiter par batch
  for (let i = 0; i < allCentres.length; i += BATCH_SIZE) {
    const batch = allCentres.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allCentres.length / BATCH_SIZE);

    const results = await geocodeBatch(batch);

    for (const r of results) {
      geocoded++;

      if (r.score < 0.4) {
        lowScore++;
        continue; // Score trop bas, on ne met pas a jour
      }

      if (!DRY_RUN) {
        const { error } = await supabase
          .from('centres_auditifs')
          .update({ lat: r.lat, lng: r.lng })
          .eq('id', r.id);

        if (error) {
          console.error(`  Erreur update ${r.id}: ${error.message}`);
          failed++;
        } else {
          updated++;
        }
      } else {
        updated++;
      }
    }

    const batchFailed = batch.length - results.length;
    failed += batchFailed;

    if (batchNum % 5 === 0 || batchNum === totalBatches) {
      console.log(`  Batch ${batchNum}/${totalBatches} — geocodes: ${geocoded}, mis a jour: ${updated}, score bas: ${lowScore}, echecs: ${failed}`);
    }

    await sleep(DELAY_MS);
  }

  console.log('\n=== Resultat ===');
  console.log(`Centres traites:  ${allCentres.length}`);
  console.log(`Geocodes:         ${geocoded}`);
  console.log(`Mis a jour:       ${updated}`);
  console.log(`Score trop bas:   ${lowScore} (< 0.4, pas mis a jour)`);
  console.log(`Echecs:           ${failed}`);
  if (DRY_RUN) console.log('(DRY RUN — rien ecrit en base)');
}

main().catch(console.error);
