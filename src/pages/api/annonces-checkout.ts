export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createServerClient } from '../../lib/supabase';
import type { AnnonceProduit } from '../../types/annonce';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15' as Stripe.LatestApiVersion,
});

const PRICE_MAP: Record<AnnonceProduit, { envKey: string; montant: number }> = {
  unlock_contacts: { envKey: 'STRIPE_PRICE_UNLOCK_CONTACTS', montant: 900 },
  premium: { envKey: 'STRIPE_PRICE_PREMIUM_ANNONCE', montant: 2900 },
  boost_semaine: { envKey: 'STRIPE_PRICE_BOOST_SEMAINE', montant: 900 },
  alerte_ciblee: { envKey: 'STRIPE_PRICE_ALERTE_CIBLEE', montant: 1900 },
  pack_cession: { envKey: 'STRIPE_PRICE_PACK_CESSION', montant: 9900 },
  pack_cession_accomp: { envKey: 'STRIPE_PRICE_PACK_CESSION_ACCOMP', montant: 34900 },
};

function getPriceId(produit: AnnonceProduit): string | undefined {
  const entry = PRICE_MAP[produit];
  if (!entry) return undefined;
  return (import.meta.env as Record<string, string>)[entry.envKey];
}

export const POST: APIRoute = async ({ request }) => {
  // TEMPORAIREMENT DESACTIVE — les options premium annonces seront activees
  // quand le volume d'annonces le justifiera et que chaque feature sera fonctionnelle.
  // TODO: reactiver produit par produit quand chaque feature sera implementee
  return new Response(
    JSON.stringify({
      error: 'Les options premium annonces ne sont pas encore disponibles. Deposez votre annonce gratuitement.',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  );

  try {
    const body = await request.json();
    const { annonce_id, produit, user_id } = body as {
      annonce_id: string;
      produit: AnnonceProduit;
      user_id: string;
    };

    if (!annonce_id || !produit || !user_id) {
      return new Response(
        JSON.stringify({ error: 'annonce_id, produit et user_id sont requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const priceId = getPriceId(produit);
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: 'Produit invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifier que l'annonce existe et appartient a l'utilisateur
    const supabase = createServerClient();
    const { data: annonce, error: dbError } = await supabase
      .from('annonces')
      .select('id, slug, user_id')
      .eq('id', annonce_id)
      .single();

    if (dbError || !annonce) {
      return new Response(
        JSON.stringify({ error: 'Annonce introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (annonce.user_id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Non autorise.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        type: 'annonce',
        annonce_id,
        user_id,
        produit,
      },
      success_url: `${origin}/annonces/${annonce.slug}/?payment=success`,
      cancel_url: `${origin}/annonces/${annonce.slug}/?payment=cancel`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Annonces checkout error:', errMsg);
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la creation de la session de paiement.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
