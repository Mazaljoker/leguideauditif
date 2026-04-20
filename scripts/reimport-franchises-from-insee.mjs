/**
 * Ré-import franchises corrompues (3 719 centres) depuis INSEE Sirene API.
 *
 * Matching : SIRET (100% couverture en base).
 * Préservation : fiches claimed/premium → on ne touche pas aux champs déjà remplis.
 * Fiches plan='rpps' → on écrase nom, ville, adresse, slug avec données INSEE.
 *
 * Champs INSEE toujours préservés : rpps, siret, finess, lat, lng, plan,
 * claim_status, claimed_by_email, a_propos, photo_url, audio_prenom,
 * horaires, marques, specialites, email, site_web, tel, insee_enriched_at.
 *
 * Usage :
 *   node scripts/reimport-franchises-from-insee.mjs                     # dry-run
 *   node scripts/reimport-franchises-from-insee.mjs --apply             # production
 *   node scripts/reimport-franchises-from-insee.mjs --limit 10          # test 10 centres
 *   node scripts/reimport-franchises-from-insee.mjs --apply --resume    # reprendre un run interrompu
 *
 * Durée : ~2h15 sur les 3 719 (rate limit INSEE 28 req/min).
 * Resumable : progression stockée dans reports/reimport-progress.json
 * Logs : reports/reimport-log-{timestamp}.csv
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';

// --- Config ---
const INSEE_API_KEY = process.env.INSEE_API_KEY;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!INSEE_API_KEY) {
  console.error('INSEE_API_KEY manquante. Ajouter dans .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Args ---
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RESUME = args.includes('--resume');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// --- Rate limiting INSEE ---
const INSEE_DELAY_MS = 2150; // ~28 req/min
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Paths ---
const PROGRESS_PATH = 'reports/reimport-progress.json';
const LOG_PATH = `reports/reimport-log-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
const REDIRECTS_PATH = 'reports/reimport-redirects.json';

// --- Slugify (copie de src/lib/departements.ts côté JS) ---
const LIGATURE_MAP = { œ: 'oe', Œ: 'OE', æ: 'ae', Æ: 'AE' };

function slugifyCentre(nom, ville, cp, idSuffix) {
  const base = `${nom || 'centre'} ${ville || ''} ${cp || ''}`
    .replace(/[œŒæÆ]/g, (c) => LIGATURE_MAP[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${idSuffix}`;
}

// --- Appel API Sirene ---
async function fetchSiretData(siret) {
  const url = `https://api.insee.fr/api-sirene/3.11/siret/${siret}`;
  try {
    const res = await fetch(url, {
      headers: { 'X-INSEE-Api-Key-Integration': INSEE_API_KEY },
    });
    if (res.status === 404) return { error: 'not_found' };
    if (res.status === 429) {
      console.warn(`    Rate limited, pause 60s...`);
      await sleep(60000);
      return fetchSiretData(siret);
    }
    if (!res.ok) return { error: `http_${res.status}` };

    const data = await res.json();
    const etab = data.etablissement;
    const adresse = etab.adresseEtablissement || {};
    const periode = etab.periodesEtablissement?.[0] || {};

    // Enseigne réelle (nom de l'agence physique)
    const enseigne =
      periode.enseigne1Etablissement ||
      periode.enseigne2Etablissement ||
      periode.enseigne3Etablissement ||
      periode.denominationUsuelleEtablissement ||
      data.etablissement.uniteLegale?.denominationUniteLegale ||
      null;

    // Adresse : numéro + type voie + libellé
    const adresseStr = [
      adresse.numeroVoieEtablissement,
      adresse.indiceRepetitionEtablissement,
      adresse.typeVoieEtablissement,
      adresse.libelleVoieEtablissement,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      nom: enseigne,
      ville: adresse.libelleCommuneEtablissement || null,
      cp: adresse.codePostalEtablissement || null,
      adresse: adresseStr || null,
      etat_administratif: periode.etatAdministratifEtablissement || 'A',
    };
  } catch (e) {
    return { error: e.message };
  }
}

// --- Load progress state ---
function loadProgress() {
  if (!RESUME || !existsSync(PROGRESS_PATH)) {
    return { processedIds: [], startedAt: new Date().toISOString() };
  }
  try {
    return JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8'));
  } catch {
    return { processedIds: [], startedAt: new Date().toISOString() };
  }
}

function saveProgress(state) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(state, null, 2));
}

// --- Fetch corrompus depuis Supabase (même filtre que diagnostic) ---
async function fetchCorrompus() {
  const PAGE_SIZE = 1000;
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select(
        'id, slug, nom, cp, ville, adresse, siret, plan, claim_status, a_propos, photo_url, audio_prenom, horaires, marques, specialites, tel, email, site_web'
      )
      .or('ville.is.null,ville.ilike.france,slug.ilike.%-france-%')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Même filtre final que diagnostic pour cohérence
  return all.filter((c) => {
    const villeNorm = (c.ville || '').trim().toLowerCase();
    const slugLower = (c.slug || '').toLowerCase();
    const nomLower = (c.nom || '').toLowerCase();
    const villeMissing = villeNorm === 'france' || !villeNorm;
    const slugGenerique = slugLower.includes('-france-') && nomLower.includes('france');
    return villeMissing || slugGenerique;
  });
}

// --- Merge policy ---
function computeMerge(centre, insee) {
  const isClaimed = centre.plan === 'claimed' || centre.plan === 'premium';
  const updates = {};

  // Nom
  if (insee.nom) {
    if (!isClaimed) {
      updates.nom = insee.nom;
    } else if (!centre.nom || centre.nom.toUpperCase().includes('FRANCE')) {
      // Fiche claimed mais nom encore générique → on enrichit
      updates.nom = insee.nom;
    }
    // sinon : fiche claimed avec nom propre → préserver
  }

  // Ville
  if (insee.ville) {
    if (!isClaimed || !centre.ville) {
      updates.ville = insee.ville;
    }
    // sinon : claimed avec ville remplie → préserver
  }

  // Adresse
  if (insee.adresse) {
    if (!isClaimed || !centre.adresse) {
      updates.adresse = insee.adresse;
    }
  }

  // CP : en principe correct, mais au cas où
  if (insee.cp && insee.cp !== centre.cp && !isClaimed) {
    updates.cp = insee.cp;
  }

  return updates;
}

// --- Main ---
async function main() {
  console.log(`=== Ré-import franchises depuis INSEE Sirene ===`);
  console.log(`Mode         : ${APPLY ? 'APPLY (production)' : 'DRY-RUN'}`);
  console.log(`Limit        : ${LIMIT === Infinity ? 'aucune' : LIMIT}`);
  console.log(`Resume       : ${RESUME ? 'oui' : 'non'}`);
  console.log(`Rate limit   : 28 req/min`);
  console.log(`---`);

  const progress = loadProgress();
  const processedSet = new Set(progress.processedIds);
  console.log(`Progress file: ${progress.processedIds.length} déjà traités`);

  const allCorrompus = await fetchCorrompus();
  console.log(`Corrompus en base : ${allCorrompus.length}`);

  const toProcess = allCorrompus.filter((c) => !processedSet.has(c.id)).slice(0, LIMIT);
  console.log(`À traiter dans ce run : ${toProcess.length}`);
  console.log(`---`);

  // Initialise log CSV
  const logHeader =
    'id,old_slug,new_slug,old_nom,new_nom,old_ville,new_ville,old_adresse,new_adresse,plan,status,applied,error\n';
  writeFileSync(LOG_PATH, logHeader);
  console.log(`Log CSV : ${LOG_PATH}`);
  console.log(`---`);

  // Redirects accumulated
  const redirects = existsSync(REDIRECTS_PATH)
    ? JSON.parse(readFileSync(REDIRECTS_PATH, 'utf-8'))
    : [];

  let ok = 0;
  let skipped = 0;
  let errors = 0;
  let previewCount = 0;

  const eta = Math.ceil((toProcess.length * INSEE_DELAY_MS) / 60000);
  console.log(`ETA : ~${eta} min`);
  console.log(`---`);

  for (let i = 0; i < toProcess.length; i++) {
    const c = toProcess[i];
    const insee = await fetchSiretData(c.siret);
    await sleep(INSEE_DELAY_MS);

    if (insee.error) {
      errors++;
      appendFileSync(
        LOG_PATH,
        `"${c.id}","${c.slug}","","${c.nom ?? ''}","","${c.ville ?? ''}","","${c.adresse ?? ''}","","${c.plan}","error",false,"${insee.error}"\n`
      );
      processedSet.add(c.id);
      if (i % 50 === 0) {
        saveProgress({ processedIds: [...processedSet], startedAt: progress.startedAt });
      }
      continue;
    }

    const updates = computeMerge(c, insee);
    const newVille = updates.ville ?? c.ville;
    const newNom = updates.nom ?? c.nom;
    const newAdresse = updates.adresse ?? c.adresse;
    const newCp = updates.cp ?? c.cp;
    const idSuffix = c.id.slice(0, 6);
    const newSlug = slugifyCentre(newNom, newVille, newCp, idSuffix);
    const slugChanged = newSlug !== c.slug;

    if (slugChanged) updates.slug = newSlug;

    const hasUpdates = Object.keys(updates).length > 0;
    let applied = false;

    if (hasUpdates && APPLY) {
      const { error } = await supabase
        .from('centres_auditifs')
        .update(updates)
        .eq('id', c.id);
      if (error) {
        errors++;
        appendFileSync(
          LOG_PATH,
          `"${c.id}","${c.slug}","${newSlug}","${c.nom ?? ''}","${newNom ?? ''}","${c.ville ?? ''}","${newVille ?? ''}","${c.adresse ?? ''}","${newAdresse ?? ''}","${c.plan}","error",false,"${error.message}"\n`
        );
      } else {
        applied = true;
        ok++;
      }
    } else if (hasUpdates) {
      // dry-run
      ok++;
      if (previewCount < 5) {
        console.log(`  [preview ${previewCount + 1}] ${c.id.slice(0, 8)}…`);
        console.log(`    nom    : "${c.nom}" → "${newNom}"`);
        console.log(`    ville  : "${c.ville}" → "${newVille}"`);
        console.log(`    slug   : "${c.slug}" → "${newSlug}"`);
        previewCount++;
      }
    } else {
      skipped++;
    }

    if (slugChanged) {
      redirects.push({ old: c.slug, new: newSlug, plan: c.plan });
    }

    appendFileSync(
      LOG_PATH,
      `"${c.id}","${c.slug}","${newSlug}","${c.nom ?? ''}","${newNom ?? ''}","${c.ville ?? ''}","${newVille ?? ''}","${c.adresse ?? ''}","${newAdresse ?? ''}","${c.plan}","ok",${applied},""\n`
    );

    processedSet.add(c.id);

    // Save progress every 50 items
    if ((i + 1) % 50 === 0) {
      saveProgress({ processedIds: [...processedSet], startedAt: progress.startedAt });
      writeFileSync(REDIRECTS_PATH, JSON.stringify(redirects, null, 2));
      console.log(`  [${i + 1}/${toProcess.length}] ok=${ok} skip=${skipped} err=${errors}`);
    }
  }

  // Final save
  saveProgress({ processedIds: [...processedSet], startedAt: progress.startedAt });
  writeFileSync(REDIRECTS_PATH, JSON.stringify(redirects, null, 2));

  console.log(`---`);
  console.log(`TERMINÉ`);
  console.log(`  OK         : ${ok}`);
  console.log(`  Skipped    : ${skipped}`);
  console.log(`  Erreurs    : ${errors}`);
  console.log(`  Redirects  : ${redirects.length} (cumulés dans ${REDIRECTS_PATH})`);
  if (!APPLY) {
    console.log(`  MODE DRY-RUN : rien n'a été modifié en base.`);
    console.log(`  Pour appliquer : npx tsx scripts/reimport-franchises-from-insee.mjs --apply`);
  }
}

main().catch((e) => {
  console.error('Erreur fatale :', e);
  process.exit(1);
});
