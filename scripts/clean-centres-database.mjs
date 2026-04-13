/**
 * Nettoyage et deduplication de la base centres_auditifs
 * Objectif : passer de ~8800 entrees brutes a ~7900 centres reels
 *
 * Etapes :
 * 1. Supprimer les faux positifs (non-audio par nom)
 * 2. Dedoublonner par SIRET (meme SIRET = meme etablissement)
 * 3. Dedoublonner par adresse normalisee (meme adresse physique)
 * 4. Marquer les centres comme verified/unverified
 *
 * Usage:
 *   node scripts/clean-centres-database.mjs --dry-run    # analyse sans modification
 *   node scripts/clean-centres-database.mjs              # nettoyage en production
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

// --- Faux positifs : noms qui ne sont clairement pas des centres audio ---
const FAUX_POSITIFS_REGEX = [
  // Sante non-audio
  /\b(ambulance|pompe.?funebre|veterinaire|dentaire|dental|orthodont|podo(log|proth)|kinesithera|osteopath|sage.?femme|infirmier|pharma(?!cie.*audit))\b/i,
  // Materiel medical generique (sans audio)
  /\b(oxygene|respirat|perfusion|dialyse|stomie|incontinence|fauteuil.?roulant|lit.?medical|matelas)\b/i,
  // Commerce non-medical
  /\b(coiffur|beaute|esthetiq|pressing|restaurant|boulang|patisseri|boucheri|fleurist|tabac|bar|cafe|hotel|garage|carrosseri|plomber|electrici|peintur|maconneri|menuis|charpent|couvertur|jardin|paysag|piscin)\b/i,
  // Tech/industrie
  /\b(informatiq|robot|drone|imprim|signaletiq|publicite|communication|marketing|consulting|formation|securit|alarme|videosurv|extincteur|ascenseur|climatisation)\b/i,
  // Perruques/capillaire
  /\b(perruqu|capillair|prothes(?:e|iste).?capillair)\b/i,
];

function isFauxPositif(nom) {
  return FAUX_POSITIFS_REGEX.some(rx => rx.test(nom));
}

// --- Normaliser une adresse pour deduplication ---
function normalizeAdresse(adresse, cp) {
  if (!adresse || !cp) return null;
  return (adresse + '|' + cp)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(rue|avenue|boulevard|place|chemin|impasse|allee|passage|route|cours|square)\b/g, '')
    .replace(/[^a-z0-9|]/g, '')
    .replace(/\s+/g, '');
}

// --- Main ---
async function main() {
  console.log('=== Nettoyage base centres_auditifs ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);

  // 1. Charger tous les centres (pagine)
  console.log('\n--- Chargement des centres ---');
  let allCentres = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select('id, nom, adresse, cp, ville, departement, siret, source, created_at, is_premium, claimed_by_email')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) { console.error('Erreur:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allCentres = allCentres.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`Total en base: ${allCentres.length}`);

  // --- ETAPE 1 : Faux positifs par nom ---
  console.log('\n--- Etape 1 : Faux positifs par nom ---');
  const fauxPositifs = allCentres.filter(c => isFauxPositif(c.nom));
  // Ne jamais supprimer un centre premium ou claim
  const fauxPositifsASupprimerr = fauxPositifs.filter(c => !c.is_premium && !c.claimed_by_email);
  console.log(`Faux positifs detectes: ${fauxPositifs.length}`);
  console.log(`Faux positifs a supprimer (non-premium/non-claimed): ${fauxPositifsASupprimerr.length}`);

  if (fauxPositifsASupprimerr.length > 0) {
    console.log('Exemples:');
    for (const c of fauxPositifsASupprimerr.slice(0, 15)) {
      console.log(`  [FP] ${c.nom} (${c.ville || '?'})`);
    }
  }

  // --- ETAPE 2 : Doublons SIRET ---
  console.log('\n--- Etape 2 : Doublons SIRET ---');
  const siretMap = new Map();
  const centresRestants = allCentres.filter(c => !fauxPositifsASupprimerr.some(fp => fp.id === c.id));

  for (const c of centresRestants) {
    if (!c.siret) continue;
    const siret = String(c.siret).padStart(14, '0');
    if (!siretMap.has(siret)) {
      siretMap.set(siret, []);
    }
    siretMap.get(siret).push(c);
  }

  const doublonsSiret = [];
  for (const [siret, centres] of siretMap) {
    if (centres.length <= 1) continue;
    // Garder le centre le plus "riche" (premium > claimed > rpps > insee-sirene)
    centres.sort((a, b) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (b.is_premium && !a.is_premium) return 1;
      if (a.claimed_by_email && !b.claimed_by_email) return -1;
      if (b.claimed_by_email && !a.claimed_by_email) return 1;
      if (a.source === 'rpps' && b.source !== 'rpps') return -1;
      if (b.source === 'rpps' && a.source !== 'rpps') return 1;
      return 0;
    });
    // Le premier est le keeper, les autres sont doublons
    for (let i = 1; i < centres.length; i++) {
      doublonsSiret.push(centres[i]);
    }
  }
  console.log(`Doublons SIRET detectes: ${doublonsSiret.length}`);
  if (doublonsSiret.length > 0) {
    console.log('Exemples:');
    for (const c of doublonsSiret.slice(0, 10)) {
      console.log(`  [DUP-SIRET] ${c.nom} (${c.ville || '?'}) — SIRET ${c.siret}`);
    }
  }

  // --- ETAPE 3 desactivee (risque de faux dedup sur meme adresse) ---

  // --- BILAN ---
  const totalASupprimer = fauxPositifsASupprimerr.length + doublonsSiret.length;
  const totalFinal = allCentres.length - totalASupprimer;

  console.log('\n=== BILAN ===');
  console.log(`Total actuel:            ${allCentres.length}`);
  console.log(`Faux positifs:          -${fauxPositifsASupprimerr.length}`);
  console.log(`Doublons SIRET:         -${doublonsSiret.length}`);
  console.log(`---`);
  console.log(`Total apres nettoyage:   ${totalFinal}`);
  console.log(`Chiffre officiel 2025:   ~7 898 (Annuaire de l'Audition)`);
  console.log(`Ecart:                   ${totalFinal > 7898 ? '+' : ''}${totalFinal - 7898} (${((totalFinal / 7898 - 1) * 100).toFixed(1)}%)`);

  if (DRY_RUN) {
    console.log('\n(DRY RUN — rien supprime)');
    return;
  }

  // --- Suppression ---
  console.log('\n--- Suppression en cours ---');
  const idsASupprimer = [
    ...fauxPositifsASupprimerr.map(c => c.id),
    ...doublonsSiret.map(c => c.id),
  ];

  // Supprimer par batch de 100
  let deleted = 0;
  for (let i = 0; i < idsASupprimer.length; i += 100) {
    const batch = idsASupprimer.slice(i, i + 100);
    const { error } = await supabase
      .from('centres_auditifs')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`Erreur suppression batch ${i}: ${error.message}`);
    } else {
      deleted += batch.length;
    }
  }

  console.log(`\nSupprime: ${deleted} centres`);
  console.log(`Total final en base: ${allCentres.length - deleted}`);
}

main().catch(console.error);