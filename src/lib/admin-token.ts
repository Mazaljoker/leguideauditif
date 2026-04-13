/**
 * Tokens HMAC-SHA256 pour les actions admin one-click (approve/reject depuis email).
 * Le secret est le SUPABASE_SERVICE_ROLE_KEY — disponible uniquement cote serveur.
 */

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function generateAdminToken(action: string, slug: string): Promise<string> {
  const secret = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');

  const key = await getKey(secret);
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(`${action}:${slug}`));
  const bytes = new Uint8Array(signature);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyAdminToken(action: string, slug: string, token: string): Promise<boolean> {
  const expected = await generateAdminToken(action, slug);
  return expected === token;
}
