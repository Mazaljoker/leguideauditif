/**
 * Decouverte de nouveaux centres auditifs 2025 via API Sirene 3.11
 * Recherche bulk par code NAF + date creation, puis insert dans Supabase
 *
 * Usage:
 *   node scripts/discover-new-centres-2025.mjs              # decouvrir et inserer
 *   node scripts/discover-new-centres-2025.mjs --dry-run    # test sans ecriture
 *   node scripts/discover-new-centres-2025.mjs --since 2024-06-01  # date custom
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
const sinceIdx = args.indexOf('--since');
const SINCE = sinceIdx !== -1 ? args[sinceIdx + 1] : '2025-01-01';

// --- Codes NAF pertinents ---
const NAF_CODES = [
  '47.74Z', // Commerce de detail d'articles medicaux et orthopediques (audioprothese)
  // 32.50A retire : trop de faux positifs (dentaire, chirurgical, non-audio)
];

// --- Enseignes exclues (pas des prospects independants) ---
const ENSEIGNES_EXCLUES = [
  'audika', 'amplifon', 'audition sant', 'mutualit', 'optical center',
  'afflelou', 'krys', 'atol', 'optic 2000', 'ecouter voir', 'audilab',
  'entendre', 'grandaudition', 'audition conseil', 'audio 2000',
  'sonalto', 'ideal audition', 'sonova', 'audioprothesiste mutualiste',
];

function isEnseigne(nom) {
  const lower = (nom || '').toLowerCase();
  return ENSEIGNES_EXCLUES.some(e => lower.includes(e));
}

// --- Rate limiting ---
const DELAY_MS = 2100;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --- Generer un slug unique ---
function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// --- Recherche bulk API Sirene ---
async function searchSirene(nafCode, since, cursor = 0) {
  // API Sirene 3.11 : recherche multi-criteres
  // periode() est requis pour les champs de periodesEtablissement
  // etatAdministratifEtablissement est un champ de periode comme activitePrincipale
  const q = `periode(activitePrincipaleEtablissement:${nafCode} AND etatAdministratifEtablissement:A) AND dateCreationEtablissement:[${since} TO *]`;

  // encodeURIComponent au lieu de URLSearchParams (qui double-encode les crochets)
  const url = `https://api.insee.fr/api-sirene/3.11/siret?q=${encodeURIComponent(q)}&nombre=100&debut=${cursor}`;
  const res = await fetch(url, {
    headers: { 'X-INSEE-Api-Key-Integration': INSEE_API_KEY },
  });

  if (res.status === 429) {
    console.warn('  Rate limited, pause 60s...');
    await sleep(60000);
    return searchSirene(nafCode, since, cursor);
  }

  if (res.status === 404) {
    // Aucun resultat
    return { etablissements: [], total: 0 };
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`Erreur API ${res.status}: ${body.substring(0, 200)}`);
    return { etablissements: [], total: 0 };
  }

  const data = await res.json();
  return {
    etablissements: data.etablissements || [],
    total: data.header?.total || 0,
  };
}

// --- Extraire les infos d'un etablissement Sirene ---
function parseEtablissement(etab) {
  const addr = etab.adresseEtablissement || {};
  const adresseParts = [
    addr.numeroVoieEtablissement,
    addr.typeVoieEtablissement,
    addr.libelleVoieEtablissement,
  ].filter(Boolean);

  if (addr.complementAdresseEtablissement) {
    adresseParts.push(addr.complementAdresseEtablissement);
  }

  const nom =
    etab.uniteLegale?.denominationUsuelle1UniteLegale ||
    etab.periodesEtablissement?.[0]?.enseigne1Etablissement ||
    etab.uniteLegale?.denominationUniteLegale ||
    'Inconnu';

  const cp = addr.codePostalEtablissement || '';
  const ville = addr.libelleCommuneEtablissement || '';
  const departement = cp.substring(0, 2);

  return {
    nom,
    adresse: adresseParts.join(' ') || 'Adresse inconnue',
    cp,
    ville,
    departement: departement === '97' ? cp.substring(0, 3) : departement,
    siret: etab.siret,
    source: 'insee-sirene',
    date_creation_etablissement: etab.dateCreationEtablissement || null,
    code_naf: etab.periodesEtablissement?.[0]?.activitePrincipaleEtablissement || null,
    est_siege: etab.etablissementSiege || false,
    tranche_effectifs: etab.trancheEffectifsEtablissement || null,
    categorie_entreprise: etab.uniteLegale?.categorieEntreprise || null,
    etat_administratif: 'A',
    insee_enriched_at: new Date().toISOString(),
  };
}

// --- Main ---
async function main() {
  console.log('=== Decouverte nouveaux centres auditifs ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (pas d\'ecriture)' : 'PRODUCTION'}`);
  console.log(`Depuis: ${SINCE}`);
  console.log(`Codes NAF: ${NAF_CODES.join(', ')}`);

  // 1. Recuperer tous les SIRET existants en base (pour deduplication)
  console.log('\n--- Chargement SIRET existants ---');
  const existingSirets = new Set();
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select('siret')
      .not('siret', 'is', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Erreur Supabase:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.siret) existingSirets.add(String(row.siret).padStart(14, '0'));
    }
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`SIRET en base: ${existingSirets.size}`);

  // 2. Rechercher par code NAF
  let allNew = [];

  for (const naf of NAF_CODES) {
    console.log(`\n--- Recherche NAF ${naf} depuis ${SINCE} ---`);
    let cursor = 0;
    let total = null;

    while (true) {
      const result = await searchSirene(naf, SINCE, cursor);
      if (total === null) {
        total = result.total;
        console.log(`Total trouve par INSEE: ${total}`);
      }

      if (result.etablissements.length === 0) break;

      for (const etab of result.etablissements) {
        const siret = String(etab.siret).padStart(14, '0');

        // Dedup
        if (existingSirets.has(siret)) continue;

        const parsed = parseEtablissement(etab);

        // Exclure enseignes
        if (isEnseigne(parsed.nom)) continue;

        // Filtrer : garder seulement les vrais centres audio
        // (exclure les opticiens purs sans lien audio si possible)
        allNew.push(parsed);
        existingSirets.add(siret); // eviter doublons entre NAF
      }

      cursor += result.etablissements.length;
      console.log(`  Page ${Math.ceil(cursor / 100)} — ${cursor}/${total} lus, ${allNew.length} nouveaux`);

      if (cursor >= total) break;
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n--- Resultats ---`);
  console.log(`Nouveaux centres trouves: ${allNew.length}`);

  if (allNew.length === 0) {
    console.log('Rien a inserer.');
    return;
  }

  // Afficher les premiers
  console.log('\nApercu (10 premiers):');
  for (const c of allNew.slice(0, 10)) {
    console.log(`  ${c.nom} | ${c.cp} ${c.ville} | SIRET ${c.siret} | cree ${c.date_creation_etablissement}`);
  }

  // 3. Inserer en base
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < allNew.length; i++) {
    const centre = allNew[i];
    const slug = slugify(`${centre.nom}-${centre.ville || centre.cp}-${centre.siret.slice(-4)}`);

    const row = {
      legacy_id: `sirene-${centre.siret}`,
      slug,
      nom: centre.nom,
      adresse: centre.adresse,
      cp: centre.cp,
      ville: centre.ville,
      departement: centre.departement,
      siret: centre.siret,
      source: centre.source,
      date_creation_etablissement: centre.date_creation_etablissement,
      code_naf: centre.code_naf,
      est_siege: centre.est_siege,
      tranche_effectifs: centre.tranche_effectifs,
      etat_administratif: centre.etat_administratif,
      insee_enriched_at: centre.insee_enriched_at,
    };

    if (DRY_RUN) {
      console.log(`  [DRY] ${i + 1}/${allNew.length} ${centre.nom} (${centre.ville})`);
      inserted++;
      continue;
    }

    const { error: insertError } = await supabase
      .from('centres_auditifs')
      .insert(row);

    if (insertError) {
      // Slug duplique possible — retry avec suffixe
      if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
        row.slug = `${slug}-${Date.now()}`;
        const { error: retryError } = await supabase
          .from('centres_auditifs')
          .insert(row);
        if (retryError) {
          console.error(`  [ERR] ${centre.nom}: ${retryError.message}`);
          errors++;
          continue;
        }
      } else {
        console.error(`  [ERR] ${centre.nom}: ${insertError.message}`);
        errors++;
        continue;
      }
    }

    inserted++;
    if ((i + 1) % 25 === 0) {
      console.log(`  Inseres: ${inserted}/${allNew.length}`);
    }
  }

  console.log('\n=== Bilan final ===');
  console.log(`Nouveaux centres decouverts: ${allNew.length}`);
  console.log(`Inseres en base:            ${inserted}`);
  console.log(`Erreurs:                    ${errors}`);
  if (DRY_RUN) console.log('(DRY RUN — rien ecrit en base)');
}

main().catch(console.error);
