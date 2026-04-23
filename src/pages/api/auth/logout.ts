export const prerender = false;

// POST /api/auth/logout
// Supprime les cookies sb-access-token / sb-refresh-token / lga_centre_slug.
// Le client Supabase côté JS doit aussi appeler supabase.auth.signOut()
// avant de rediriger pour invalider la session sur Supabase.

import type { APIRoute } from 'astro';
import { ACTIVE_CENTRE_COOKIE } from '../../../lib/audiopro';

export const POST: APIRoute = ({ cookies }) => {
  cookies.delete('sb-access-token', { path: '/' });
  cookies.delete('sb-refresh-token', { path: '/' });
  cookies.delete(ACTIVE_CENTRE_COOKIE, { path: '/' });

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
