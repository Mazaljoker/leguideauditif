export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const secret = import.meta.env.ADMIN_SECRET;
    const body = await request.json();
    const { centreSlug, token } = body;

    if (!secret || token !== secret) {
      return new Response(
        JSON.stringify({ error: 'Non autorise.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!centreSlug) {
      return new Response(
        JSON.stringify({ error: 'centreSlug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    const { data: centre, error: fetchError } = await supabase
      .from('centres_auditifs')
      .select('slug, plan, claim_status')
      .eq('slug', centreSlug)
      .single();

    if (fetchError || !centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.claim_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Aucune demande en attente pour ce centre.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({
        plan: 'claimed',
        claimed: true,
        claim_status: 'approved',
      })
      .eq('slug', centreSlug);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la validation.' }),
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
