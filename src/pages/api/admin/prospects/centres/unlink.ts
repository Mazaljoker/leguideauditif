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
    const { prospect_id, centre_id } = body ?? {};

    if (!isValidUuid(prospect_id) || !isValidUuid(centre_id)) {
      return new Response(
        JSON.stringify({ error: 'UUIDs invalides.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    const { error: deleteError } = await supabase
      .from('prospect_centres')
      .delete()
      .eq('prospect_id', prospect_id)
      .eq('centre_id', centre_id);

    if (deleteError) {
      console.error('[unlink centre]', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du détachement.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
