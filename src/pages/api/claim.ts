export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { centreSlug, nom, prenom, email, adeli } = body;

    if (!centreSlug || !nom || !prenom || !email || !adeli) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Adresse email invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Verifier que le centre existe et n'est pas deja revendique
    const { data: centre, error: fetchError } = await supabase
      .from('centres_auditifs')
      .select('slug, nom, claimed, is_premium')
      .eq('slug', centreSlug)
      .single();

    if (fetchError || !centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.claimed || centre.is_premium) {
      return new Response(
        JSON.stringify({ error: 'Ce centre a deja ete revendique.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Revendiquer le centre
    const { error: updateError } = await supabase
      .from('centres_auditifs')
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        claimed_by_email: email,
        claimed_by_name: `${prenom} ${nom}`,
        claimed_by_adeli: adeli,
      })
      .eq('slug', centreSlug);

    if (updateError) {
      console.error('Claim update error:', updateError.message);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la revendication. Veuillez reessayer.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: `/revendiquer-gratuit/confirmation/?centre=${centreSlug}`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Claim error:', errMsg);
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
