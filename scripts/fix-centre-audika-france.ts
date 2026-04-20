/**
 * Diagnostic des centres Audika corrompus (nom générique "AUDIKA FRANCE" + ville=null).
 *
 * À l'origine un simple fix pour /centre/audika-france-30000/ flaggé en GSC,
 * le dry-run a révélé 643 entrées corrompues. Le fix naïf a été désactivé —
 * la solution propre est un ré-import FINESS ciblé (chantier séparé).
 *
 * Ce script ne fait maintenant que DIAGNOSTIC + EXPORT CSV pour alimenter
 * le chantier de ré-import. --apply est bloqué par une garde de sécurité.
 *
 * Usage :
 *   npx tsx scripts/fix-centre-audika-france.ts                # dry-run + export CSV
 *   npx tsx scripts/fix-centre-audika-france.ts --apply        # BLOQUÉ si > 5 candidats
 *
 * Prérequis : PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY dans l'environnement.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const APPLY_MAX_CANDIDATES = 5;
const CSV_EXPORT_PATH = 'reports/centres-audika-corrompus.csv';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Erreur : PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const villeArgIndex = args.indexOf('--ville');
const OVERRIDE_VILLE = villeArgIndex >= 0 ? args[villeArgIndex + 1] : null;

function slugifyCentre(nom: string, ville: string, cp: string, idSuffix: string): string {
  const base = `${nom} ${ville} ${cp}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${idSuffix}`;
}

type Candidate = {
  id: string;
  slug: string | null;
  nom: string | null;
  adresse: string | null;
  cp: string | null;
  ville: string | null;
  departement: string | null;
};

async function runQuery(label: string, query: any): Promise<Candidate[]> {
  const { data, error } = await query;
  if (error) {
    console.error(`  [${label}] Erreur : ${error.message}`);
    return [];
  }
  const count = data?.length ?? 0;
  console.log(`  [${label}] ${count} match`);
  return (data as Candidate[]) ?? [];
}

async function main() {
  console.log(`[fix-centre-audika-france] Mode : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log('---');
  console.log('Diagnostic multi-patterns :');

  const baseSelect = 'id, slug, nom, adresse, cp, ville, departement';
  const seen = new Map<string, Candidate>();

  const mergeResults = (results: Candidate[]) => {
    for (const c of results) seen.set(c.id, c);
  };

  // Pattern 1 : slug exact connu
  mergeResults(
    await runQuery(
      'slug=audika-france-30000',
      supabase.from('centres_auditifs').select(baseSelect).eq('slug', 'audika-france-30000')
    )
  );

  // Pattern 2 : slug commence par audika-france
  mergeResults(
    await runQuery(
      'slug starts with audika-france',
      supabase.from('centres_auditifs').select(baseSelect).ilike('slug', 'audika-france%')
    )
  );

  // Pattern 3 : slug contient france (suffixe possible avec id)
  mergeResults(
    await runQuery(
      'slug contains -france-',
      supabase.from('centres_auditifs').select(baseSelect).ilike('slug', '%-france-%')
    )
  );

  // Pattern 4 : ville = France (variantes casse/espaces)
  mergeResults(
    await runQuery(
      'ville ilike france',
      supabase.from('centres_auditifs').select(baseSelect).ilike('ville', 'france')
    )
  );
  mergeResults(
    await runQuery(
      'ville ilike %france%',
      supabase.from('centres_auditifs').select(baseSelect).ilike('ville', '%france%')
    )
  );

  // Pattern 5 : Audika + cp=30000
  mergeResults(
    await runQuery(
      'nom Audika + cp=30000',
      supabase
        .from('centres_auditifs')
        .select(baseSelect)
        .eq('cp', '30000')
        .ilike('nom', '%audika%')
    )
  );

  // Pattern 6 : ville vide / null + cp=30000
  mergeResults(
    await runQuery(
      'cp=30000 AND ville is null',
      supabase.from('centres_auditifs').select(baseSelect).eq('cp', '30000').is('ville', null)
    )
  );

  console.log('---');

  const candidates = Array.from(seen.values());

  if (candidates.length === 0) {
    console.log('Aucun centre candidat trouvé avec les 7 patterns. Rien à faire.');
    console.log('Si GSC référence encore /centre/audika-france-30000/, la 404 HTTP');
    console.log('du Chantier 2 désindexera naturellement sous 2-4 semaines.');
    return;
  }

  console.log(`${candidates.length} candidat(s) unique(s) trouvé(s) :`);
  for (const c of candidates) {
    console.log(
      `  id=${c.id} slug="${c.slug}" nom="${c.nom}" ville="${c.ville}" cp=${c.cp} adresse="${c.adresse}"`
    );
  }
  console.log('---');

  // 2. Filtrer : ne cibler que les candidats réellement corrompus
  //    (ville = 'France' littéral, ville null, ou slug contient '-france-')
  const needsFix = candidates.filter((c) => {
    const villeNorm = (c.ville || '').trim().toLowerCase();
    const slugLower = (c.slug || '').toLowerCase();
    return villeNorm === 'france' || !villeNorm || slugLower.includes('-france-');
  });

  if (needsFix.length === 0) {
    console.log('Tous les candidats ont une ville valide. Aucune correction nécessaire.');
    console.log('Liste complète pour référence ci-dessus.');
    return;
  }

  console.log(`${needsFix.length} candidat(s) corrompu(s) :`);
  for (const c of needsFix.slice(0, 10)) {
    console.log(`  id=${c.id} slug="${c.slug}" ville="${c.ville}" nom="${c.nom}" cp=${c.cp}`);
  }
  if (needsFix.length > 10) {
    console.log(`  ... et ${needsFix.length - 10} autres (voir CSV complet).`);
  }
  console.log('---');

  // Export CSV pour le chantier de ré-import FINESS
  const csvLines = [
    'id,slug,nom,cp,ville,adresse,departement',
    ...needsFix.map((c) => {
      const esc = (v: string | null) => `"${(v || '').replace(/"/g, '""')}"`;
      return [esc(c.id), esc(c.slug), esc(c.nom), esc(c.cp), esc(c.ville), esc(c.adresse), esc(c.departement)].join(',');
    }),
  ];
  try {
    writeFileSync(CSV_EXPORT_PATH, csvLines.join('\n'), 'utf-8');
    console.log(`Export CSV : ${CSV_EXPORT_PATH} (${needsFix.length} lignes)`);
  } catch (e) {
    console.warn(`Impossible d'écrire ${CSV_EXPORT_PATH} : ${(e as Error).message}`);
  }
  console.log('---');

  // Garde de sécurité : refuser --apply si trop de candidats.
  // Le fix naïf (ville='Nîmes' pour tous) serait catastrophique sur 643 centres.
  if (needsFix.length > APPLY_MAX_CANDIDATES) {
    console.log(
      `GARDE DE SECURITE : ${needsFix.length} candidats > ${APPLY_MAX_CANDIDATES} autorisés par --apply.`
    );
    console.log('Ce volume nécessite un ré-import FINESS, pas une heuristique ville=Nîmes.');
    console.log('--apply est BLOQUE dans ce cas. Voir Docs/plan-reimport-finess.md.');
    return;
  }

  // 3. Pour chaque candidat corrompu, déterminer la vraie ville
  const updates: { id: string; newVille: string; newSlug: string; oldSlug: string }[] = [];
  for (const c of needsFix) {
    let newVille: string;
    if (OVERRIDE_VILLE) {
      newVille = OVERRIDE_VILLE;
    } else {
      // Heuristique : déduire la ville depuis l'adresse si possible.
      // Pour cp=30000 (Gard), la ville logique est "Nîmes".
      newVille = 'Nîmes';
    }

    const idSuffix = c.id.slice(0, 6);
    const newSlug = slugifyCentre(c.nom || 'centre', newVille, c.cp || '', idSuffix);

    updates.push({
      id: c.id,
      newVille,
      newSlug,
      oldSlug: c.slug || '',
    });
  }

  // 4. Afficher le plan
  console.log('Plan de correction :');
  for (const u of updates) {
    console.log(`  id=${u.id}`);
    console.log(`    ville : (vide ou "France") → "${u.newVille}"`);
    console.log(`    slug  : "${u.oldSlug}" → "${u.newSlug}"`);
  }
  console.log('---');

  // 5. Exécution (si --apply)
  if (!APPLY) {
    console.log('[DRY-RUN] Aucune modification appliquée. Relancer avec --apply pour exécuter.');
    return;
  }

  console.log('Application des corrections...');
  for (const u of updates) {
    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({ ville: u.newVille, slug: u.newSlug })
      .eq('id', u.id);

    if (updateError) {
      console.error(`  [FAIL] id=${u.id} : ${updateError.message}`);
    } else {
      console.log(`  [OK]   id=${u.id} : ville+slug mis à jour`);
    }
  }

  console.log('---');
  console.log('Termine. Penser a ajouter un redirect 301 dans vercel.json :');
  for (const u of updates) {
    console.log(
      `  { "source": "/centre/${u.oldSlug}/", "destination": "/centre/${u.newSlug}/", "permanent": true }`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
