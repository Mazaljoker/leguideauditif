export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../lib/supabase';

const ALLOWED_FIELDS = ['nom', 'tel', 'site_web', 'horaires', 'a_propos', 'specialites', 'marques'];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Non autoris\u00e9. Veuillez vous connecter.' }),
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

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { centreSlug, ...fields } = body;

    if (!centreSlug) {
      return new Response(
        JSON.stringify({ error: 'centreSlug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Verifier que le centre appartient a cet utilisateur
    const { data: centre, error: fetchError } = await supabase
      .from('centres_auditifs')
      .select('slug, claimed_by_email, claim_status')
      .eq('slug', centreSlug)
      .single();

    if (fetchError || !centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (user.email !== centre.claimed_by_email || centre.claim_status !== 'approved') {
      return new Response(
        JSON.stringify({ error: 'Non autoris\u00e9.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filtrer uniquement les champs autorises
    const updateData: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in fields) {
        updateData[key] = fields[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun champ \u00e0 modifier.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update(updateData)
      .eq('slug', centreSlug);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise \u00e0 jour.' }),
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
