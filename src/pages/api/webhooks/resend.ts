/**
 * Webhook Resend — réception en temps réel des événements email.
 *
 * Resend signe ses webhooks via Svix. On vérifie 3 headers :
 *  - svix-id        : id unique du delivery (anti-replay simple)
 *  - svix-timestamp : unix seconds, fenêtre 5 min
 *  - svix-signature : "v1,base64sig" (potentiellement plusieurs séparées par espaces)
 *
 * Le secret est de la forme "whsec_<base64>" — on retire le préfixe avant
 * de décoder. HMAC-SHA256 sur `${id}.${timestamp}.${rawBody}`.
 *
 * Effets DB par type d'événement :
 *  - email.delivered  → email_events.delivered_at
 *  - email.opened     → email_events.opened_at  (premier open, idempotent)
 *  - email.clicked    → email_events.clicked_at (premier click, idempotent)
 *  - email.bounced    → email_events.bounced_at + (si permanent) audiopro_lifecycle.hard_bounced_at
 *  - email.complained → email_events.complaint_at + audiopro_lifecycle.unsubscribe_level='hard' (RGPD strict)
 *  - email.sent / email.delivery_delayed / email.failed → log only
 *
 * Configuration Resend : Dashboard → Webhooks → Add webhook
 *  - URL : https://leguideauditif.fr/api/webhooks/resend
 *  - Events : tout cocher (delivered, opened, clicked, bounced, complained recommandé)
 *  - Resend te donne un whsec_... à mettre dans Vercel env RESEND_WEBHOOK_SECRET
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

const TOLERANCE_SECONDS = 300;

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

export const POST: APIRoute = async ({ request }) => {
  const secret = (
    import.meta.env.RESEND_WEBHOOK_SECRET ||
    process.env.RESEND_WEBHOOK_SECRET ||
    ''
  ).trim();

  if (!secret) {
    console.error('[webhook/resend] RESEND_WEBHOOK_SECRET non configuré');
    return new Response('Server config error', { status: 500 });
  }

  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const tsSec = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(tsSec)) {
    return new Response('Bad timestamp', { status: 400 });
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsSec) > TOLERANCE_SECONDS) {
    return new Response('Timestamp out of window', { status: 400 });
  }

  const rawBody = await request.text();

  const secretBase64 = secret.replace(/^whsec_/, '');
  const secretBytes = Buffer.from(secretBase64, 'base64');
  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expectedSig = createHmac('sha256', secretBytes)
    .update(signedPayload)
    .digest('base64');

  const providedSigs = svixSignature
    .split(' ')
    .map((s) => s.split(',')[1])
    .filter(Boolean);

  const expectedBuf = Buffer.from(expectedSig);
  let valid = false;
  for (const sig of providedSigs) {
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)) {
      valid = true;
      break;
    }
  }
  if (!valid) {
    console.warn('[webhook/resend] signature invalide');
    return new Response('Invalid signature', { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    console.warn(`[webhook/resend] event ${event.type} sans email_id`);
    // 200 : on n'a rien à faire mais Resend ne doit pas retry
    return new Response('OK (no email_id)', { status: 200 });
  }

  const eventTime = new Date(event.created_at ?? Date.now()).toISOString();
  const supabase = createServerClient();

  switch (event.type) {
    case 'email.delivered':
      await updateEmailEvent(supabase, emailId, 'delivered_at', eventTime);
      break;
    case 'email.opened':
      await updateEmailEvent(supabase, emailId, 'opened_at', eventTime);
      break;
    case 'email.clicked':
      await updateEmailEvent(supabase, emailId, 'clicked_at', eventTime);
      break;
    case 'email.bounced': {
      await updateEmailEvent(supabase, emailId, 'bounced_at', eventTime);
      const isPermanent = event.data?.bounce?.type === 'permanent';
      if (isPermanent) {
        await markAudioproHardBounced(supabase, emailId, eventTime);
      }
      break;
    }
    case 'email.complained':
      await updateEmailEvent(supabase, emailId, 'complaint_at', eventTime);
      await markAudioproHardUnsub(supabase, emailId, eventTime);
      break;
    case 'email.sent':
    case 'email.delivery_delayed':
    case 'email.failed':
      // Pas de col dédiée — on log
      console.log(`[webhook/resend] ${event.type} pour ${emailId}`);
      break;
    default:
      console.log(`[webhook/resend] type non géré: ${event.type}`);
  }

  return new Response('OK', { status: 200 });
};

/**
 * Update idempotent : on ne réécrit pas un timestamp déjà rempli.
 * Préserve le PREMIER open / click historique.
 */
async function updateEmailEvent(
  supabase: SupabaseClient,
  emailId: string,
  column: 'delivered_at' | 'opened_at' | 'clicked_at' | 'bounced_at' | 'complaint_at',
  eventTime: string,
): Promise<void> {
  const { error } = await supabase
    .from('email_events')
    .update({ [column]: eventTime })
    .eq('resend_message_id', emailId)
    .is(column, null);

  if (error) {
    console.error(`[webhook/resend] update ${column} failed pour ${emailId}:`, error.message);
  }
}

async function markAudioproHardBounced(
  supabase: SupabaseClient,
  emailId: string,
  eventTime: string,
): Promise<void> {
  const { data: ev } = await supabase
    .from('email_events')
    .select('audiopro_id')
    .eq('resend_message_id', emailId)
    .maybeSingle();

  if (!ev?.audiopro_id) return;

  const { error } = await supabase
    .from('audiopro_lifecycle')
    .update({ hard_bounced_at: eventTime })
    .eq('id', ev.audiopro_id)
    .is('hard_bounced_at', null);

  if (error) {
    console.error(`[webhook/resend] hard_bounce ${ev.audiopro_id}:`, error.message);
  }
}

async function markAudioproHardUnsub(
  supabase: SupabaseClient,
  emailId: string,
  eventTime: string,
): Promise<void> {
  const { data: ev } = await supabase
    .from('email_events')
    .select('audiopro_id')
    .eq('resend_message_id', emailId)
    .maybeSingle();

  if (!ev?.audiopro_id) return;

  const { error } = await supabase
    .from('audiopro_lifecycle')
    .update({
      email_unsubscribed_at: eventTime,
      unsubscribe_level: 'hard',
    })
    .eq('id', ev.audiopro_id)
    .is('email_unsubscribed_at', null);

  if (error) {
    console.error(`[webhook/resend] hard_unsub ${ev.audiopro_id}:`, error.message);
  }
}
