/**
 * Script de migration one-shot : audioprothesistes.json → Supabase centres_auditifs
 *
 * Usage :
 *   npx tsx scripts/migrate-centres.ts
 *
 * Prerequis :
 *   - Table centres_auditifs creee (voir supabase/migrations/001_centres_auditifs.sql)
 *   - Variables d'environnement definies :
 *       PUBLIC_SUPABASE_URL
 *       SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ===== Config ===== */
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 500;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Erreur : PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent etre definis.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/* ===== Types ===== */
interface RawCentre {
  id: string;
  nom: string;
  enseigne?: string;
  adresse: string;
  cp: string;
  ville?: string;
  departement: string;
  lat: number;
  lng: number;
  siret?: number | string;
  tel?: string;
  horaires?: string;
  site_web?: string;
  finess?: string;
  source: string;
}

interface CentreRow {
  legacy_id: string;
  slug: string;
  nom: string;
  adresse: string;
  cp: string;
  ville: string | null;
  departement: string;
  lat: number;
  lng: number;
  siret: string | null;
  tel: string | null;
  horaires: string | null;
  site_web: string | null;
  finess: string | null;
  source: string;
}

/* ===== Slug generation ===== */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9]+/g, '-') // remplace les caracteres speciaux par -
    .replace(/^-+|-+$/g, '') // supprime les tirets en debut/fin
    .slice(0, 80);
}

function generateSlug(
  nom: string,
  cp: string,
  ville?: string
): string {
  const parts = [nom, cp];
  if (ville) parts.push(ville);
  return slugify(parts.join(' '));
}

function deduplicateSlug(slug: string, usedSlugs: Set<string>): string {
  if (!usedSlugs.has(slug)) {
    usedSlugs.add(slug);
    return slug;
  }
  let counter = 2;
  while (usedSlugs.has(`${slug}-${counter}`)) {
    counter++;
  }
  const unique = `${slug}-${counter}`;
  usedSlugs.add(unique);
  return unique;
}

/* ===== SIRET padding ===== */
function padSiret(siret: number | string | undefined): string | null {
  if (siret === undefined || siret === null) return null;
  return String(siret).padStart(14, '0');
}

/* ===== Main ===== */
async function main() {
  console.log('Lecture de audioprothesistes.json...');

  const jsonPath = resolve(
    import.meta.dirname ?? '.',
    '../src/data/audioprothesistes.json'
  );
  const raw: RawCentre[] = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  console.log(`${raw.length} entrees lues.`);

  // Generer les slugs uniques (les entrees sans GPS sont incluses avec lat/lng null)
  const usedSlugs = new Set<string>();
  const rows: CentreRow[] = raw.map((c) => {
    const baseSlug = generateSlug(c.nom, c.cp, c.ville);
    const slug = deduplicateSlug(baseSlug, usedSlugs);

    return {
      legacy_id: c.id,
      slug,
      nom: c.nom,
      adresse: c.adresse,
      cp: c.cp,
      ville: c.ville || null,
      departement: c.departement,
      lat: c.lat,
      lng: c.lng,
      siret: padSiret(c.siret),
      tel: c.tel || null,
      horaires: c.horaires || null,
      site_web: c.site_web || null,
      finess: c.finess || null,
      source: c.source,
    };
  });

  console.log(`${rows.length} centres a inserer (${usedSlugs.size} slugs uniques).`);

  // Insertion par batch
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('centres_auditifs').insert(batch);

    if (error) {
      console.error(
        `Erreur batch ${i / BATCH_SIZE + 1} (lignes ${i + 1}-${i + batch.length}):`,
        error.message
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(
        `Batch ${i / BATCH_SIZE + 1} OK — ${inserted}/${rows.length} inseres`
      );
    }
  }

  console.log('\n--- Resume ---');
  console.log(`Total entrees JSON : ${raw.length}`);
  console.log(`Sans GPS (ignores) : ${skipped}`);
  console.log(`Inseres avec succes : ${inserted}`);
  console.log(`Erreurs : ${errors}`);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
