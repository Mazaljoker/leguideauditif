export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import {
  logEmailEvent,
  getAudioproMissingFields,
  getSlotsFondateursRestants,
} from '../../../lib/audiopro-lifecycle';
import { buildEmailForTemplate } from '../../../lib/email-drip';
import type { EmailTemplateKey } from '../../../types/audiopro-lifecycle';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

/**
 * Endpoint de relance manuelle déclenché par le bouton dropdown
 * dans /admin/claims. Auth : session Supabase + email admin
 * (pattern aligné sur src/pages/api/admin/prospects/create.ts).
 *
 * Phase 2 (PR-d) : tous les nurtures + `nouvel_espace_pro_annonce` sont
 * fonctionnels en plus de `fiche_incomplete_relance`. Templates
 * transactionnels (claim_*, payment_*, subscription_cancelled,
 * premium_welcome) restent refusés — ils ont leur propre point d'entrée.
 *
 * Bypasse les règles de collision CRM (Franck décide). Respecte
 * `email_unsubscribed_at` et `hard_bounced_at` (RGPD non négociable).
 */

const ALLOWED_TEMPLATES: ReadonlySet<EmailTemplateKey> = new Set([
  'fiche_incomplete_relance',
  'nurture_01_premiers_patients',
  'nurture_02_offre_fondateurs',
  'nurture_03_cas_concret',
  'nurture_04_slots_restants',
  'nurture_05_ads_ou_sortie',
  'nouvel_espace_pro_annonce',
]);

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

  if (!ALLOWED_TEMPLATES.has(template_key as EmailTemplateKey)) {
    // premium_welcome est webhook-only ; les transactionnels claim_*/payment_*
    // ont leur propre route. On ne les expose pas en relance manuelle.
    return json(
      { error: `Template "${template_key}" non disponible en relance manuelle.` },
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

  // Pré-fetch des inputs partagés. On les fetch tout le temps (overhead minime
  // pour un envoi unitaire admin), même si certains templates n'en ont pas
  // besoin — ça simplifie le code et évite des switch redondants.
  const missing = await getAudioproMissingFields(supabase, audiopro_id);
  const slotsRestants = await getSlotsFondateursRestants(supabase);

  const tk = template_key as EmailTemplateKey;

  // Précondition métier : `fiche_incomplete_relance` n'a aucun sens si
  // toutes les fiches sont complètes. On bloque (409) plutôt qu'envoyer un
  // mail "il manque X" alors que rien ne manque.
  if (tk === 'fiche_incomplete_relance') {
    const hasIncompleteCentre = missing.some((m) => m.missing_fields.length > 0);
    if (!hasIncompleteCentre) {
      return json({ error: 'Fiches déjà complètes — rien à relancer.' }, 409);
    }
  }

  // Précondition douce : on prévient si l'admin envoie un nurture Fondateurs
  // alors qu'il n'y a plus de slots. On laisse passer (Franck décide), mais
  // c'est un signal qu'un message statique du genre "0 places restantes"
  // est en route — utile en relecture inbox avant un broadcast.
  if ((tk === 'nurture_02_offre_fondateurs' || tk === 'nurture_04_slots_restants') && slotsRestants <= 0) {
    console.warn(`[relance-email] ${tk} envoyé avec slotsRestants=${slotsRestants} — l'email indiquera "0 places".`);
  }

  let choice;
  try {
    choice = buildEmailForTemplate(tk, audiopro, { missing, slotsRestants });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: `Build template a échoué : ${msg}` }, 500);
  }

  const emailResult = await sendEmail({
    to: audiopro.email,
    subject: choice.subject,
    html: choice.html,
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
      template_key: tk,
      resend_message_id: emailResult.messageId ?? null,
      trigger: 'manual_admin',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[relance-email] email_events log failed:', msg);
  }

  // Si l'audio est lié à un prospect : trace dans la timeline CRM.
  if (audiopro.prospect_id) {
    try {
      await supabase.from('prospect_interactions').insert({
        prospect_id: audiopro.prospect_id,
        kind: 'email',
        content: `Email manuel envoyé : ${tk}`,
        occurred_at: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[relance-email] prospect_interactions log failed:', msg);
    }
  }

  return json({ success: true, template_key: tk }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
