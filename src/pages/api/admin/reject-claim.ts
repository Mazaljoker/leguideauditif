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

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({
        claim_status: 'rejected',
        claimed_by_email: null,
        claimed_by_name: null,
        claimed_by_adeli: null,
        claimed_at: null,
      })
      .eq('slug', centreSlug)
      .eq('claim_status', 'pending');

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
