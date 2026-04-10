export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verifier la session admin
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Non autorise.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Non autorise.' }),
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
