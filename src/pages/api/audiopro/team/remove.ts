export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';

// Supprime un collaborateur. Le titulaire (role='titulaire') est protégé
// — il représente le claim owner et ne peut être retiré qu'en transférant
// d'abord le titre (flow non implémenté en Phase 2).

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function authUser(cookies: { get(name: string): { value?: string } | undefined }) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  if (!accessToken || !refreshToken) return null;
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await authClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return user;
}

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { audioId } = body as { audioId?: string };
    if (!audioId) return json({ error: 'audioId requis.' }, 400);

    const supabase = createServerClient();

    const { data: audioRow } = await supabase
      .from('centre_audios')
      .select('id, role, centre_id, centres_auditifs!inner(claimed_by_email, claim_status, plan)')
      .eq('id', audioId)
      .single();
    if (!audioRow) return json({ error: 'Audioprothésiste introuvable.' }, 404);

    const centre = (audioRow as unknown as {
      centres_auditifs: { claimed_by_email: string; claim_status: string; plan: string };
    }).centres_auditifs;
    if (
      centre.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }

    if ((audioRow as { role?: string }).role === 'titulaire') {
      return json(
        { error: 'Impossible de retirer le titulaire. Transférez d\'abord le titre à un collaborateur.' },
        400,
      );
    }

    const { error } = await supabase
      .from('centre_audios')
      .delete()
      .eq('id', audioId);

    if (error) {
      console.error('[team/remove]', error.message);
      return json({ error: 'Suppression impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur.';
    return json({ error: msg }, 500);
  }
};
