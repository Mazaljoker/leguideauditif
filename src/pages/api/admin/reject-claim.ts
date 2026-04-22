export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Verifier la session admin
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
    const { centreSlug } = body;

    if (!centreSlug) {
      return new Response(
        JSON.stringify({ error: 'centreSlug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({
        plan: 'rpps',
        claim_status: 'rejected',
        claimed: false,
        claimed_by_email: null,
        claimed_by_name: null,
        claimed_by_adeli: null,
        claimed_at: null,
      })
      .eq('slug', centreSlug)
      .in('claim_status', ['pending', 'approved']);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors du rejet.' }),
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
