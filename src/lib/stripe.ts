import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Client Stripe initialisé de manière lazy pour garantir
 * que la clé est disponible au runtime en environnement serverless.
 */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}
