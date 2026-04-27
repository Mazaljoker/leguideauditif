export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import {
  logEmailEvent,
  getAudioproMissingFields,
} from '../../../lib/audiopro-lifecycle';
import { ficheIncompleteRelanceEmail } from '../../../emails/fiche-incomplete-relance';
import type { EmailTemplateKey } from '../../../types/audiopro-lifecycle';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

/**
 * Endpoint de relance manuelle déclenché par le bouton dropdown
 * dans /admin/claims (Étape 3). Auth : session Supabase + email admin
 * (pattern aligné sur src/pages/api/admin/prospects/create.ts).
 *
 * Phase 1 : seul `fiche_incomplete_relance` est fonctionnel. Les autres
 * templates retournent 400 "non implémenté en Phase 1".
 *
 * Bypasse les règles de collision CRM (Franck décide). Respecte
 * email_unsubscribed_at et hard_bounced_at.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || user.email !== ADMIN_EMAIL) {
    return json({ error: 'Non autorisé.' }, 401);
  }

  let body: { audiopro_id?: string; template_key?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body JSON invalide.' }, 400);
  }

  const { audiopro_id, template_key } = body;
  if (!audiopro_id || !template_key) {
    return json({ error: 'audiopro_id et template_key requis.' }, 400);
  }

  // En Phase 1 : seul fiche_incomplete_relance est fonctionnel.
  // premium_welcome est bien déclaré EmailTemplateKey, mais ce endpoint
  // ne le sert PAS (déclenché uniquement par le webhook Stripe).
  if (template_key !== 'fiche_incomplete_relance') {
    return json(
      { error: `Template "${template_key}" non implémenté en Phase 1.` },
      400,
    );
  }

  const supabase = createServerClient();

  const { data: audiopro } = await supabase
    .from('audiopro_lifecycle')
    .select('*')
    .eq('id', audiopro_id)
    .maybeSingle();

  if (!audiopro) {
    return json({ error: 'Audio introuvable.' }, 404);
  }

  if (audiopro.email_unsubscribed_at) {
    return json({ error: 'Audio désabonné — relance impossible.' }, 409);
  }
  if (audiopro.hard_bounced_at) {
    return json({ error: 'Adresse email en bounce permanent.' }, 409);
  }

  // fiche_incomplete_relance : génération HTML + check complétude
  const missing = await getAudioproMissingFields(supabase, audiopro_id);
  const hasIncompleteCentre = missing.some((m) => m.missing_fields.length > 0);
  if (!hasIncompleteCentre) {
    return json({ error: 'Fiches déjà complètes — rien à relancer.' }, 409);
  }

  const html = ficheIncompleteRelanceEmail({
    prenom: audiopro.prenom ?? '',
    centres: missing,
    unsubscribeToken: audiopro.email_preferences_token,
  });

  const nbIncomplet = missing.filter((m) => m.missing_fields.length > 0).length;
  const subject = nbIncomplet === 1
    ? 'Il manque quelques infos sur votre fiche'
    : `Il manque des infos sur ${nbIncomplet} de vos fiches`;

  const emailResult = await sendEmail({
    to: audiopro.email,
    subject,
    html,
    replyTo: 'franckolivier@leguideauditif.fr',
  });

  if (!emailResult.success) {
    return json(
      { error: `Erreur envoi email : ${emailResult.error ?? 'inconnue'}` },
      500,
    );
  }

  // Log email_events (non bloquant — le mail est parti, on loggue best-effort)
  try {
    await logEmailEvent(supabase, {
      audiopro_id: audiopro.id,
      centre_slug: null,
      recipient_email: audiopro.email,
      template_key: template_key as EmailTemplateKey,
      resend_message_id: emailResult.messageId ?? null,
      trigger: 'manual_admin',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[relance-email] email_events log failed:', msg);
  }

  // Si l'audio est lié à un prospect : trace dans la timeline CRM.
  // Table réelle : prospect_interactions (pas `interactions` comme la spec PRD).
  if (audiopro.prospect_id) {
    try {
      await supabase.from('prospect_interactions').insert({
        prospect_id: audiopro.prospect_id,
        kind: 'email',
        content: `Email manuel envoyé : ${template_key}`,
        occurred_at: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[relance-email] prospect_interactions log failed:', msg);
    }
  }

  return json({ success: true }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
