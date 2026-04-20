/**
 * Diagnostic read-only des 640 centres franchises corrompus.
 *
 * Caractérise la disponibilité des clés d'enrichissement (SIRET, RPPS, FINESS,
 * lat/lng) et détecte les claims utilisateur. Produit un rapport CSV + stats.
 *
 * Usage :
 *   npx tsx scripts/diagnostic-centres-corrompus.ts
 *
 * Prérequis : PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Erreur : PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const REPORT_PATH = 'reports/diagnostic-centres-corrompus.csv';

async function main() {
  console.log('=== Diagnostic centres corrompus ===');
  console.log('Cible : centres avec (ville=null OR ville ILIKE france) + slug contient -france-');
  console.log('---');

  const PAGE_SIZE = 1000;
  const rows: any[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('centres_auditifs')
      .select(
        'id, slug, nom, cp, ville, adresse, departement, siret, rpps, finess, lat, lng, plan, claim_status, claimed_by_email, a_propos, photo_url, audio_prenom, horaires, marques, specialites, insee_enriched_at'
      )
      .or('ville.is.null,ville.ilike.france,slug.ilike.%-france-%')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Erreur Supabase :', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // Filtre final : ville manquante OU slug contenant -france- avec nom = enseigne générique
  const corrupted = rows.filter((c) => {
    const villeNorm = (c.ville || '').trim().toLowerCase();
    const slugLower = (c.slug || '').toLowerCase();
    const nomLower = (c.nom || '').toLowerCase();
    const villeMissing = villeNorm === 'france' || !villeNorm;
    const slugGenerique = slugLower.includes('-france-') && nomLower.includes('france');
    return villeMissing || slugGenerique;
  });

  console.log(`Total candidats bruts : ${rows.length}`);
  console.log(`Total corrompus filtrés : ${corrupted.length}`);
  console.log('---');

  // Stats de couverture des clés
  const stats = {
    total: corrupted.length,
    siret: { present: 0, missing: 0 },
    rpps: { present: 0, missing: 0 },
    finess: { present: 0, missing: 0 },
    latlng: { present: 0, missing: 0 },
    insee_enriched: { yes: 0, no: 0 },
    claim: { claimed: 0, premium: 0, rpps: 0, other: 0 },
    has_user_data: 0,
    ville_null: 0,
    ville_france: 0,
  };

  const byEnseigne = new Map<string, number>();

  for (const c of corrupted) {
    if (c.siret) stats.siret.present++;
    else stats.siret.missing++;

    if (c.rpps) stats.rpps.present++;
    else stats.rpps.missing++;

    if (c.finess) stats.finess.present++;
    else stats.finess.missing++;

    if (c.lat && c.lng) stats.latlng.present++;
    else stats.latlng.missing++;

    if (c.insee_enriched_at) stats.insee_enriched.yes++;
    else stats.insee_enriched.no++;

    const plan = (c.plan || 'other') as keyof typeof stats.claim;
    if (plan in stats.claim) stats.claim[plan]++;
    else stats.claim.other++;

    if (c.a_propos || c.photo_url || c.audio_prenom || c.horaires || (c.marques && c.marques.length) || (c.specialites && c.specialites.length)) {
      stats.has_user_data++;
    }

    if (!c.ville) stats.ville_null++;
    else if ((c.ville || '').trim().toLowerCase() === 'france') stats.ville_france++;

    const nom = (c.nom || '').toUpperCase();
    const enseigne = nom.split(' ')[0] || 'AUTRE';
    byEnseigne.set(enseigne, (byEnseigne.get(enseigne) ?? 0) + 1);
  }

  console.log('STATS COUVERTURE CLÉS MATCHING :');
  console.log(`  SIRET présent   : ${stats.siret.present}/${stats.total} (${pct(stats.siret.present, stats.total)}%)`);
  console.log(`  RPPS présent    : ${stats.rpps.present}/${stats.total} (${pct(stats.rpps.present, stats.total)}%)`);
  console.log(`  FINESS présent  : ${stats.finess.present}/${stats.total} (${pct(stats.finess.present, stats.total)}%)`);
  console.log(`  lat/lng présent : ${stats.latlng.present}/${stats.total} (${pct(stats.latlng.present, stats.total)}%)`);
  console.log(`  INSEE enrichi   : ${stats.insee_enriched.yes}/${stats.total} (${pct(stats.insee_enriched.yes, stats.total)}%)`);
  console.log('---');
  console.log('CHAMP ville corrompu :');
  console.log(`  ville = null    : ${stats.ville_null}`);
  console.log(`  ville = "France": ${stats.ville_france}`);
  console.log('---');
  console.log('PLANS UTILISATEUR (critique — données à préserver) :');
  console.log(`  rpps (non claim): ${stats.claim.rpps}`);
  console.log(`  claimed         : ${stats.claim.claimed}`);
  console.log(`  premium         : ${stats.claim.premium}`);
  console.log(`  autre           : ${stats.claim.other}`);
  console.log(`  AVEC données user (a_propos, photo, horaires, etc.) : ${stats.has_user_data}`);
  console.log('---');
  console.log('ENSEIGNES (top 10) :');
  const sortedEnseignes = Array.from(byEnseigne.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  for (const [e, n] of sortedEnseignes) {
    console.log(`  ${n.toString().padStart(4)} ${e}`);
  }
  console.log('---');

  // Export CSV détaillé
  const csv = [
    [
      'id',
      'slug',
      'nom',
      'cp',
      'ville',
      'adresse',
      'departement',
      'siret',
      'rpps',
      'finess',
      'lat',
      'lng',
      'plan',
      'claim_status',
      'has_user_data',
      'insee_enriched_at',
    ].join(','),
    ...corrupted.map((c) => {
      const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const hasUserData =
        !!(c.a_propos || c.photo_url || c.audio_prenom || c.horaires ||
          (c.marques && c.marques.length) || (c.specialites && c.specialites.length));
      return [
        esc(c.id),
        esc(c.slug),
        esc(c.nom),
        esc(c.cp),
        esc(c.ville),
        esc(c.adresse),
        esc(c.departement),
        esc(c.siret),
        esc(c.rpps),
        esc(c.finess),
        esc(c.lat),
        esc(c.lng),
        esc(c.plan),
        esc(c.claim_status),
        esc(hasUserData),
        esc(c.insee_enriched_at),
      ].join(',');
    }),
  ];
  writeFileSync(REPORT_PATH, csv.join('\n'), 'utf-8');
  console.log(`Export détaillé : ${REPORT_PATH} (${corrupted.length} lignes)`);

  // Recommandation voie
  console.log('---');
  console.log('RECOMMANDATION VOIE :');
  if (stats.claim.claimed + stats.claim.premium > 0) {
    console.log(`  ATTENTION : ${stats.claim.claimed + stats.claim.premium} fiche(s) revendiquée(s).`);
    console.log(`  Le script reimport DOIT préserver leurs champs enrichis.`);
  } else {
    console.log(`  OK : aucune fiche revendiquée parmi les corrompus — pas de risque de perte user data.`);
  }
  const siretCoverage = stats.siret.present / stats.total;
  if (siretCoverage >= 0.9) {
    console.log(`  Voie A (INSEE Sirene) viable : ${(siretCoverage * 100).toFixed(0)}% de couverture SIRET.`);
  } else if (siretCoverage >= 0.5) {
    console.log(`  Voie A partielle (${(siretCoverage * 100).toFixed(0)}% SIRET) — prévoir fallback FINESS CSV pour le reste.`);
  } else {
    console.log(`  Voie A insuffisante (${(siretCoverage * 100).toFixed(0)}% SIRET) — bascule prioritaire sur voie B/D.`);
  }
}

function pct(n: number, total: number): string {
  return total === 0 ? '0' : ((n / total) * 100).toFixed(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
