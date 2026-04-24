export const prerender = false;

import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { getStripe } from '../../lib/stripe';
import { createServerClient } from '../../lib/supabase';
import { sendEmail, sendAdminNotification } from '../../lib/email';
import { paymentConfirmationEmail } from '../../emails/payment-confirmation';
import { paymentAdminNotificationEmail } from '../../emails/payment-admin-notification';
import { subscriptionCancelledEmail } from '../../emails/subscription-cancelled';
import { premiumWelcomeEmail } from '../../emails/premium-welcome';
import {
  transitionLifecycleStage,
  logEmailEvent,
} from '../../lib/audiopro-lifecycle';

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const webhookSecret = (import.meta.env.STRIPE_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '').trim();

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
    // Paiement initial reussi
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      // --- ANNONCES ---
      if (metadata.type === 'annonce') {
        const { annonce_id, user_id, produit } = metadata;

        if (!annonce_id || !user_id || !produit) {
          console.error('Webhook annonce: metadata incomplete', metadata);
          break;
        }

        // Insert paiement
        await supabase.from('annonces_paiements').insert({
          user_id,
          annonce_id,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          produit,
          montant: session.amount_total ?? 0,
          statut: 'paid',
        });

        // Update annonce selon le produit
        const now = new Date().toISOString();
        const boostEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const boostEndMonth = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();

        switch (produit) {
          case 'unlock_contacts':
            await supabase.from('annonces').update({ contacts_unlocked: true, updated_at: now }).eq('id', annonce_id);
            break;
          case 'premium':
            await supabase.from('annonces').update({ is_premium: true, updated_at: now }).eq('id', annonce_id);
            break;
          case 'boost_semaine':
            await supabase.from('annonces').update({ boost_until: boostEnd, updated_at: now }).eq('id', annonce_id);
            break;
          case 'alerte_ciblee':
            // Alerte ciblee : sera envoyee quand Resend sera installe
            console.log(`Alerte ciblee achetee pour annonce ${annonce_id}`);
            break;
          case 'pack_cession':
            await supabase.from('annonces').update({
              is_premium: true,
              contacts_unlocked: true,
              boost_until: boostEndMonth,
              updated_at: now,
            }).eq('id', annonce_id);
            break;
          case 'pack_cession_accomp':
            await supabase.from('annonces').update({
              is_premium: true,
              contacts_unlocked: true,
              boost_until: boostEndMonth,
              is_verified: true,
              updated_at: now,
            }).eq('id', annonce_id);
            console.log(`Pack Cession Accompagne pour annonce ${annonce_id} — action manuelle Franck-Olivier requise`);
            break;
        }

        console.log(`Webhook annonce: ${produit} applique sur ${annonce_id}`);

        // Emails de confirmation paiement annonce
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          await sendEmail({
            to: customerEmail,
            subject: `Confirmation de paiement — ${produit}`,
            html: paymentConfirmationEmail({
              email: customerEmail,
              produit,
              montant: session.amount_total ?? 0,
              annonceId: annonce_id,
            }),
          });
        }
        await sendAdminNotification(
          `Paiement annonce : ${produit}`,
          paymentAdminNotificationEmail({
            produit,
            montant: session.amount_total ?? 0,
            annonceId: annonce_id,
            userId: user_id,
            requiresAction: produit === 'pack_cession_accomp',
          }),
        );
        break;
      }

      // --- CENTRES (logique existante) ---
      const { centreSlug, email } = metadata;

      if (!centreSlug) {
        console.error('Webhook: centreSlug manquant dans metadata');
        break;
      }

      // Idempotent : verifier si deja premium avant update
      const { data: centre } = await supabase
        .from('centres_auditifs')
        .select('plan, nom')
        .eq('slug', centreSlug)
        .single();

      if (centre?.plan === 'premium') {
        console.log(`Centre ${centreSlug} deja premium, skip.`);
        break;
      }

      const { error } = await supabase
        .from('centres_auditifs')
        .update({
          plan: 'premium',
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

      // Notification admin : nouveau centre premium
      if (email) {
        await sendAdminNotification(
          `Centre premium : ${centreSlug}`,
          `<p>Le centre <strong>${centreSlug}</strong> est passé en premium.</p><p>Email : ${email}</p>`,
        );
      }

      // ───────────────────────────────────────────────────────────
      // Sync audiopro_lifecycle + email premium_welcome (Phase 1)
      // Non bloquant — pas de rollback Stripe si ça casse.
      // ───────────────────────────────────────────────────────────
      if (email) {
        try {
          const { data: audio } = await supabase
            .from('audiopro_lifecycle')
            .select('id, prenom, lifecycle_stage')
            .eq('email', email.toLowerCase())
            .maybeSingle();

          if (audio) {
            await transitionLifecycleStage(
              supabase,
              audio.id,
              'premium',
              'stripe_paid',
              {
                centre_slug: centreSlug,
                stripe_session_id: session.id,
                stripe_subscription_id: session.subscription,
              },
            );

            const welcomeResult = await sendEmail({
              to: email,
              subject: 'Bienvenue dans LeGuideAuditif Premium',
              html: premiumWelcomeEmail({
                prenom: audio.prenom ?? '',
                centreNom: centre?.nom ?? centreSlug,
                centreSlug,
              }),
              replyTo: 'franckolivier@leguideauditif.fr',
            });

            await logEmailEvent(supabase, {
              audiopro_id: audio.id,
              centre_slug: centreSlug,
              recipient_email: email,
              template_key: 'premium_welcome',
              resend_message_id: welcomeResult.messageId ?? null,
              trigger: 'webhook_stripe',
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[webhook] premium_welcome flow failed:', msg);
        }
      }
      break;
    }

    // Abonnement annule ou expire — desactiver le premium
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      const { error } = await supabase
        .from('centres_auditifs')
        .update({
          plan: 'claimed',
          is_premium: false,
          premium_until: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

      if (error) {
        console.error(`Webhook: erreur desactivation subscription ${subscription.id}:`, error);
        return new Response('Database error', { status: 500 });
      }

      console.log(`Subscription ${subscription.id} annulee, premium desactive.`);

      // Recuperer l'email du centre pour notifier
      const { data: cancelledCentre } = await supabase
        .from('centres_auditifs')
        .select('claimed_by_email, slug')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (cancelledCentre?.claimed_by_email) {
        const cancelResult = await sendEmail({
          to: cancelledCentre.claimed_by_email,
          subject: 'Votre abonnement Premium a été annulé',
          html: subscriptionCancelledEmail({ centreSlug: cancelledCentre.slug }),
          replyTo: 'franckolivier@leguideauditif.fr',
        });

        // ─────────────────────────────────────────────────────────
        // Sync audiopro_lifecycle : transition premium → churned
        // si aucun autre centre premium n'est lié à l'audio.
        // Non bloquant.
        // ─────────────────────────────────────────────────────────
        try {
          const { data: audio } = await supabase
            .from('audiopro_lifecycle')
            .select('id, lifecycle_stage')
            .eq('email', cancelledCentre.claimed_by_email.toLowerCase())
            .maybeSingle();

          if (audio) {
            await logEmailEvent(supabase, {
              audiopro_id: audio.id,
              centre_slug: cancelledCentre.slug,
              recipient_email: cancelledCentre.claimed_by_email,
              template_key: 'subscription_cancelled',
              resend_message_id: cancelResult.messageId ?? null,
              trigger: 'webhook_stripe',
            });

            if (audio.lifecycle_stage === 'premium') {
              // Check "encore au moins un centre premium lié à cet audio"
              // via 2 requêtes : plus simple que les embeds Supabase relational.
              const { data: links } = await supabase
                .from('audiopro_centres')
                .select('centre_id')
                .eq('audiopro_id', audio.id);
              const centreIds = (links ?? []).map((l) => l.centre_id);

              let stillPremium = 0;
              if (centreIds.length > 0) {
                const { count } = await supabase
                  .from('centres_auditifs')
                  .select('*', { count: 'exact', head: true })
                  .in('id', centreIds)
                  .eq('plan', 'premium');
                stillPremium = count ?? 0;
              }

              if (stillPremium === 0) {
                await transitionLifecycleStage(
                  supabase,
                  audio.id,
                  'churned',
                  'stripe_cancelled',
                  {
                    stripe_subscription_id: subscription.id,
                    centre_slug: cancelledCentre.slug,
                  },
                );
              }
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[webhook] churn flow failed:', msg);
        }
      }
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
