export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase';
import { isValidUuid } from '../../../../../lib/prospects';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Auth via middleware SSR (locals.user) — évite la 2e setSession qui
    // consomme le rotating refresh token déjà utilisé par le middleware.
    const user = locals.user;
    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const body = await request.json();
    const { prospect_id, q } = body ?? {};

    if (!isValidUuid(prospect_id)) {
      return new Response(
        JSON.stringify({ error: 'prospect_id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const queryString = typeof q === 'string' ? q.trim().slice(0, 200) : '';

    const supabase = createServerClient();

    const { data, error: rpcError } = await supabase.rpc('search_prospect_interactions', {
      p_prospect_id: prospect_id,
      p_query: queryString,
    });

    if (rpcError) {
      console.error('[search interactions]', rpcError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la recherche.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, interactions: data ?? [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
