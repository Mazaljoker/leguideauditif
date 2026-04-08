export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createServerClient } from '../../lib/supabase';

const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15' as Stripe.LatestApiVersion,
});
const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createServerClient();

  switch (event.type) {
    // Paiement initial reussi — activer le premium
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { centreSlug, email } = session.metadata || {};

      if (!centreSlug) {
        console.error('Webhook: centreSlug manquant dans metadata');
        break;
      }

      // Idempotent : verifier si deja premium avant update
      const { data: centre } = await supabase
        .from('centres_auditifs')
        .select('is_premium')
        .eq('slug', centreSlug)
        .single();

      if (centre?.is_premium) {
        console.log(`Centre ${centreSlug} deja premium, skip.`);
        break;
      }

      const { error } = await supabase
        .from('centres_auditifs')
        .update({
          is_premium: true,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          claimed_by_email: email,
          claimed_at: new Date().toISOString(),
          premium_since: new Date().toISOString(),
        })
        .eq('slug', centreSlug);

      if (error) {
        console.error(`Webhook: erreur update centre ${centreSlug}:`, error);
        return new Response('Database error', { status: 500 });
      }

      console.log(`Centre ${centreSlug} passe en premium.`);
      break;
    }

    // Abonnement annule ou expire — desactiver le premium
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from('centres_auditifs')
        .update({
          is_premium: false,
          premium_until: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error(`Webhook: erreur desactivation subscription ${subscription.id}:`, error);
        return new Response('Database error', { status: 500 });
      }

      console.log(`Subscription ${subscription.id} annulee, premium desactive.`);
      break;
    }

    // Paiement echoue — log pour suivi
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(`Paiement echoue pour customer ${invoice.customer}, subscription ${invoice.subscription}`);
      break;
    }

    default:
      // Evenements non geres — ignorer silencieusement
      break;
  }

  return new Response('OK', { status: 200 });
};
