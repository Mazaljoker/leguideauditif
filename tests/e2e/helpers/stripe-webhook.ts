import Stripe from 'stripe';

let cached: Stripe | null = null;

function stripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not defined');
  cached = new Stripe(key);
  return cached;
}

export async function postSignedWebhook(
  baseUrl: string,
  event: Record<string, unknown>,
): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not defined');

  const payload = JSON.stringify(event);
  const header = stripe().webhooks.generateTestHeaderString({ payload, secret });

  return fetch(`${baseUrl}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': header,
    },
    body: payload,
  });
}

export function buildCheckoutCompletedEvent(params: {
  centreSlug: string;
  email: string;
  subscriptionId: string;
  customerId: string;
  sessionId?: string;
}) {
  const sessionId = params.sessionId ?? `cs_test_${Date.now()}`;
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    api_version: '2024-12-18',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        customer: params.customerId,
        subscription: params.subscriptionId,
        customer_details: { email: params.email },
        amount_total: 3900,
        payment_intent: `pi_test_${Date.now()}`,
        metadata: {
          centreSlug: params.centreSlug,
          email: params.email,
          plan: 'monthly',
        },
      },
    },
  };
}

export function buildSubscriptionDeletedEvent(subscriptionId: string) {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type: 'customer.subscription.deleted',
    created: Math.floor(Date.now() / 1000),
    api_version: '2024-12-18',
    data: {
      object: {
        id: subscriptionId,
        object: 'subscription',
      },
    },
  };
}
