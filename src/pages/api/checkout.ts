export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { centreSlug, nom, prenom, email, identifiant, plan } = body;

    // Validation
    if (!centreSlug || !nom || !prenom || !email || !identifiant) {
      return new Response(
        JSON.stringify({ error: 'Tous les champs sont requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifier que le centre existe et n'est pas deja revendique
    const { data: centre, error: dbError } = await supabase
      .from('centres_auditifs')
      .select('slug, nom, is_premium')
      .eq('slug', centreSlug)
      .single();

    if (dbError || !centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (centre.is_premium) {
      return new Response(
        JSON.stringify({ error: 'Ce centre est deja revendique.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Selectionner le bon Price ID selon la formule
    const priceId = plan === 'annual'
      ? import.meta.env.STRIPE_PRICE_ID_ANNUAL
      : import.meta.env.STRIPE_PRICE_ID;

    // Creer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        centreSlug,
        nom,
        prenom,
        email,
        identifiant,
        plan: plan || 'monthly',
      },
      success_url: `${new URL(request.url).origin}/revendiquer/confirmation/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/revendiquer/?centre=${centreSlug}&cancelled=true`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la creation de la session de paiement.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
