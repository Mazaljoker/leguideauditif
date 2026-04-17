import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const TEST_SLUG = 'test-centre-e2e-99999';
export const TEST_EMAIL = 'franckolivierchabbat@gmail.com';
export const TEST_SUBSCRIPTION_ID = 'sub_test_e2e_99999';
export const TEST_CUSTOMER_ID = 'cus_test_e2e_99999';

let cached: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  }
  cached = createClient(url, key);
  return cached;
}

type State = 'rpps' | 'pending' | 'claimed' | 'premium';

const BASE_RESET = {
  plan: 'rpps',
  claim_status: 'none',
  is_premium: false,
  claimed_at: null,
  claimed_by_email: null,
  claimed_by_name: null,
  claimed_by_adeli: null,
  premium_since: null,
  premium_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  tel: null,
  horaires: null,
  site_web: null,
  a_propos: null,
  specialites: [],
  marques: [],
  photo_url: null,
  rpps: null,
};

export async function resetCentre(state: State = 'rpps') {
  const data: Record<string, unknown> = { ...BASE_RESET };

  if (state === 'pending') {
    data.claim_status = 'pending';
    data.claimed_at = new Date().toISOString();
    data.claimed_by_email = TEST_EMAIL;
    data.claimed_by_name = 'Franck-Olivier Chabbat';
    data.claimed_by_adeli = '12345678901';
  } else if (state === 'claimed') {
    data.plan = 'claimed';
    data.claim_status = 'approved';
    data.claimed_at = new Date().toISOString();
    data.claimed_by_email = TEST_EMAIL;
    data.claimed_by_name = 'Franck-Olivier Chabbat';
    data.tel = '01 23 45 67 89';
    data.horaires = 'Lun-Ven 9h-18h | Sam 9h-12h';
    data.a_propos = 'Centre de test pour le pipeline E2E.';
  } else if (state === 'premium') {
    data.plan = 'premium';
    data.claim_status = 'approved';
    data.is_premium = true;
    data.claimed_at = new Date().toISOString();
    data.claimed_by_email = TEST_EMAIL;
    data.claimed_by_name = 'Franck-Olivier Chabbat';
    data.premium_since = new Date().toISOString();
    data.stripe_customer_id = TEST_CUSTOMER_ID;
    data.stripe_subscription_id = TEST_SUBSCRIPTION_ID;
    data.tel = '01 23 45 67 89';
    data.horaires = 'Lun-Ven 9h-18h | Sam 9h-12h';
    data.site_web = 'https://example.com';
    data.a_propos = 'Centre premium E2E.';
  }

  const { error } = await admin()
    .from('centres_auditifs')
    .update(data)
    .eq('slug', TEST_SLUG);

  if (error) throw new Error(`resetCentre(${state}) failed: ${error.message}`);
}

export async function getCentre() {
  const { data, error } = await admin()
    .from('centres_auditifs')
    .select('*')
    .eq('slug', TEST_SLUG)
    .single();
  if (error) throw new Error(`getCentre failed: ${error.message}`);
  return data;
}

export async function generateAdminToken(action: 'approve' | 'reject', slug: string): Promise<string> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${action}:${slug}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
