export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';

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
    const { id } = body ?? {};

    if (!isValidUuid(id)) {
      return new Response(
        JSON.stringify({ error: 'id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();
    const { error: deleteError } = await supabase
      .from('prospects')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[delete prospect]', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la suppression.' }),
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
