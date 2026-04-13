/**
 * Script d'enrichissement INSEE via API Sirene 3.11
 * Interroge l'API pour chaque SIRET et met a jour Supabase
 *
 * Usage:
 *   node scripts/enrich-insee.mjs              # enrichir tout
 *   node scripts/enrich-insee.mjs --dry-run    # test sans ecriture
 *   node scripts/enrich-insee.mjs --limit 10   # limiter a N centres
 */

import { createClient } from '@supabase/supabase-js';

// --- Config ---
const INSEE_API_KEY = process.env.INSEE_API_KEY;
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!INSEE_API_KEY) {
  console.error('INSEE_API_KEY manquante. Ajoute-la dans .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL ou SUPABASE_KEY manquante.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Args ---
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// --- Enseignes exclues (pas des prospects independants) ---
const ENSEIGNES_EXCLUES = [
  'audika', 'amplifon', 'audition sant', 'mutualit', 'optical center',
  'afflelou', 'krys', 'atol', 'optic 2000', 'ecouter voir', 'audilab',
  'entendre', 'grandaudition', 'audition conseil', 'audio 2000',
  'sonalto', 'ideal audition',
];

function isEnseigne(nom) {
  const lower = nom.toLowerCase();
  return ENSEIGNES_EXCLUES.some(e => lower.includes(e));
}

// --- Rate limiting ---
// API Sirene : 30 requetes/minute en acces public
const DELAY_MS = 2100; // ~28 req/min pour rester safe
const BATCH_SIZE = 25;
const PAUSE_BETWEEN_BATCHES_MS = 5000;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --- Appel API INSEE ---
async function fetchSiretData(siret) {
  const url = `https://api.insee.fr/api-sirene/3.11/siret/${siret}`;
  const res = await fetch(url, {
    headers: { 'X-INSEE-Api-Key-Integration': INSEE_API_KEY }
  });

  if (res.status === 404) return null; // SIRET introuvable
  if (res.status === 429) {
    console.warn(`  Rate limited, pause 60s...`);
    await sleep(60000);
    return fetchSiretData(siret); // retry
  }
  if (!res.ok) {
    console.warn(`  Erreur ${res.status} pour ${siret}`);
    return null;
  }

  const data = await res.json();
  const etab = data.etablissement;
  const ul = etab.uniteLegale;

  return {
    date_creation_etablissement: etab.dateCreationEtablissement || null,
    date_creation_entreprise: ul.dateCreationUniteLegale || null,
    etat_administratif: ul.etatAdministratifUniteLegale || 'A',
    categorie_juridique: ul.categorieJuridiqueUniteLegale || null,
    tranche_effectifs: etab.trancheEffectifsEtablissement || null,
    categorie_entreprise: ul.categorieEntreprise || null,
    code_naf: etab.periodesEtablissement?.[0]?.activitePrincipaleEtablissement || null,
    est_siege: etab.etablissementSiege || false,
    nombre_etablissements: null, // rempli par requete SIREN separee si besoin
    insee_enriched_at: new Date().toISOString(),
  };
}

// --- Recuperer nombre d'etablissements via SIREN ---
async function fetchNombreEtablissements(siren) {
  const url = `https://api.insee.fr/api-sirene/3.11/siren/${siren}`;
  const res = await fetch(url, {
    headers: { 'X-INSEE-Api-Key-Integration': INSEE_API_KEY }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.uniteLegale?.nombreEtablissementsActifs ?? null;
}

// --- Main ---
async function main() {
  console.log('=== Enrichissement INSEE des centres auditifs ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (pas d\'ecriture)' : 'PRODUCTION'}`);
  console.log(`Limite: ${LIMIT === Infinity ? 'aucune' : LIMIT}`);

  // Recuperer tous les centres sans enrichissement INSEE (pagine)
  let allCentres = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select('id, siret, nom, ville')
      .is('insee_enriched_at', null)
      .not('siret', 'is', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Erreur Supabase:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allCentres = allCentres.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  // Filtrer les enseignes
  const centres = allCentres
    .filter(c => !isEnseigne(c.nom))
    .slice(0, LIMIT);

  console.log(`Total en base: ${allCentres.length}`);
  console.log(`Enseignes exclues: ${allCentres.filter(c => isEnseigne(c.nom)).length}`);
  console.log(`Centres a enrichir: ${centres.length}`);
  if (centres.length === 0) {
    console.log('Rien a faire.');
    return;
  }

  let enriched = 0;
  let errors = 0;
  let closed = 0;

  for (let i = 0; i < centres.length; i++) {
    const centre = centres[i];
    const siret = String(centre.siret).padStart(14, '0');
    const siren = siret.substring(0, 9);

    console.log(`[${i + 1}/${centres.length}] ${centre.nom} (${centre.ville}) — SIRET ${siret}`);

    const inseeData = await fetchSiretData(siret);

    if (!inseeData) {
      console.log('  -> SIRET introuvable ou erreur');
      errors++;
      await sleep(DELAY_MS);
      continue;
    }

    // Recuperer nombre d'etablissements (1 requete supplementaire)
    await sleep(DELAY_MS);
    const nbEtab = await fetchNombreEtablissements(siren);
    if (nbEtab !== null) {
      inseeData.nombre_etablissements = nbEtab;
    }

    if (inseeData.etat_administratif === 'F') {
      console.log('  -> FERME');
      closed++;
    }

    const tag = inseeData.est_siege ? 'SIEGE' : 'etab';
    const age = inseeData.date_creation_etablissement
      ? `cree le ${inseeData.date_creation_etablissement}`
      : 'date inconnue';
    console.log(`  -> ${tag} | ${age} | ${inseeData.categorie_entreprise || '?'} | ${nbEtab || '?'} etab | NAF ${inseeData.code_naf || '?'}`);

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('centres_auditifs')
        .update(inseeData)
        .eq('id', centre.id);

      if (updateError) {
        console.error(`  -> Erreur update: ${updateError.message}`);
        errors++;
      } else {
        enriched++;
      }
    } else {
      enriched++;
    }

    // Rate limiting
    await sleep(DELAY_MS);

    // Pause entre batches
    if ((i + 1) % BATCH_SIZE === 0) {
      console.log(`--- Pause batch (${PAUSE_BETWEEN_BATCHES_MS / 1000}s) ---`);
      await sleep(PAUSE_BETWEEN_BATCHES_MS);
    }
  }

  console.log('\n=== Resultat ===');
  console.log(`Enrichis: ${enriched}`);
  console.log(`Erreurs:  ${errors}`);
  console.log(`Fermes:   ${closed}`);
  if (DRY_RUN) console.log('(DRY RUN — rien ecrit en base)');
}

main().catch(console.error);
