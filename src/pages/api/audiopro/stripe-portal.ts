export const prerender = false;

// POST /api/audiopro/stripe-portal
//   body: { centreSlug: string }
// Crée une session Stripe Customer Portal pour le centre indiqué
// (doit être Premium et appartenir au user connecté) et renvoie l'URL.
// Le user est ensuite redirigé vers Stripe pour gérer son abonnement
// (changer de carte, voir les factures, annuler).

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';
import { getStripe } from '../../../lib/stripe';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
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

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Session invalide.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as { centreSlug?: unknown };
    const centreSlug = typeof body.centreSlug === 'string' ? body.centreSlug.trim() : '';
    if (!centreSlug) {
      return new Response(
        JSON.stringify({ error: 'centreSlug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();
    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('slug, nom, plan, claimed_by_email, claim_status, stripe_customer_id')
      .eq('slug', centreSlug)
      .single();

    const ownerEmail = (centre?.claimed_by_email ?? '').trim().toLowerCase();
    const userEmail = user.email.trim().toLowerCase();
    if (
      !centre ||
      centre.claim_status !== 'approved' ||
      ownerEmail !== userEmail
    ) {
      return new Response(
        JSON.stringify({ error: 'Centre non autorisé.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.plan !== 'premium' || !centre.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Ce centre n\'a pas d\'abonnement Premium actif.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const origin = new URL(request.url).origin;
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: centre.stripe_customer_id,
      return_url: `${origin}/audioprothesiste-pro/abonnement/`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[audiopro] stripe-portal error', msg);
    return new Response(
      JSON.stringify({ error: 'Impossible de créer la session de gestion d\'abonnement.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
