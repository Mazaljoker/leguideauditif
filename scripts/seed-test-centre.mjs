import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
dotenv.config({ path: resolve(projectRoot, '.env') });
dotenv.config({ path: resolve(projectRoot, '.env.local'), override: true });

const TEST_SLUG = 'test-centre-e2e-99999';
const TEST_DATA = {
  legacy_id: 'TEST_E2E_99999',
  slug: TEST_SLUG,
  nom: 'Centre Test E2E',
  adresse: '1 rue du Test',
  cp: '99999',
  ville: 'Test-Ville',
  departement: '99',
  lat: 48.8566,
  lng: 2.3522,
  plan: 'rpps',
  claim_status: 'none',
  is_premium: false,
  source: 'test',
  audio_prenom: 'Jean',
  audio_nom: 'Testeur',
  specialites: [],
  marques: [],
};

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: existing } = await supabase
  .from('centres_auditifs')
  .select('id')
  .eq('slug', TEST_SLUG)
  .maybeSingle();

if (existing) {
  const { error } = await supabase
    .from('centres_auditifs')
    .update(TEST_DATA)
    .eq('slug', TEST_SLUG);
  if (error) {
    console.error('Update error:', error);
    process.exit(1);
  }
  console.log(`[seed] Centre test reset: ${TEST_SLUG}`);
} else {
  const { error } = await supabase
    .from('centres_auditifs')
    .insert(TEST_DATA);
  if (error) {
    console.error('Insert error:', error);
    process.exit(1);
  }
  console.log(`[seed] Centre test cree: ${TEST_SLUG}`);
}
