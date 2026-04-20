/**
 * Applique la migration 010_centre_redirects.sql sur Supabase.
 *
 * Utilise l'endpoint /rest/v1/rpc/exec_sql si une fonction exec_sql existe,
 * sinon bascule sur l'API Supabase (création via REST CREATE TABLE impossible).
 *
 * Recommandé : exécuter manuellement le SQL dans le Dashboard Supabase
 *   → SQL Editor → coller le contenu de supabase/migrations/010_centre_redirects.sql
 *
 * Ce script tente d'abord l'approche programmatique.
 *
 * Usage :
 *   node scripts/apply-migration-010.mjs                   # dry-run (print SQL)
 *   node scripts/apply-migration-010.mjs --apply           # tentative d'exécution
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const SQL_FILE = 'supabase/migrations/010_centre_redirects.sql';
const sql = readFileSync(SQL_FILE, 'utf-8');

console.log('=== Migration 010 centre_redirects ===');
console.log(`Mode : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
console.log('---');

if (!APPLY) {
  console.log('SQL à exécuter :');
  console.log('---');
  console.log(sql);
  console.log('---');
  console.log('Options pour appliquer :');
  console.log('  A) Dashboard Supabase → SQL Editor → coller et exécuter');
  console.log('  B) node scripts/apply-migration-010.mjs --apply (expérimental)');
  console.log('  C) supabase CLI : supabase db push');
  process.exit(0);
}

// Tentative via rpc('exec_sql') — fonctionne seulement si exec_sql existe
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Test préliminaire : la table existe-t-elle déjà ?
const { error: testError } = await supabase.from('centre_redirects').select('old_slug').limit(1);

if (!testError) {
  console.log('Table centre_redirects existe déjà. Migration déjà appliquée ou redondante.');
  process.exit(0);
}

console.log('La table centre_redirects n\'existe pas. Tentative de création…');
console.log('NOTE : les CREATE TABLE ne passent pas via l\'API REST standard.');
console.log('       Bascule sur le dashboard Supabase requise.');
console.log('---');
console.log('Action manuelle recommandée :');
console.log(`  1. Ouvrir ${SUPABASE_URL.replace('.supabase.co', '.supabase.co/project/_/sql')}`);
console.log(`  2. Coller le contenu de ${SQL_FILE}`);
console.log(`  3. Cliquer "Run"`);
console.log(`  4. Vérifier : table centre_redirects visible dans Database → Tables`);
process.exit(1);
