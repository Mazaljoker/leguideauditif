/**
 * Cron drip Phase 2 — envoie 1 mail nurture par audio éligible par run.
 *
 * Schedule : `0 8 * * *` UTC = 10h Paris été / 9h Paris hiver
 * (cf. vercel.json "crons" + décision Franck-Olivier 2026-04-24).
 *
 * Auth : header `Authorization: Bearer ${CRON_SECRET}`. Vercel cron
 * l'injecte automatiquement quand la variable d'env est définie.
 *
 * Dry-run : `?dry_run=true` simule sans appel Resend ni write DB.
 * Utile pour valider en preview avant activation prod.
 *
 * Garde-fous globaux :
 *  - feature_flag `email_drip_enabled` doit être true
 *  - audios merged_into_id ou désabonnés ou hard-bounced sont exclus
 *  - audios premium/churned sont exclus (sortie pipeline)
 *  - 1 mail par audio par semaine (toutes templates nurture confondues)
 *  - collisions CRM (prospect actif, interaction <14j, tâche ouverte)
 *
 * Référence : PRD §6, §7, §8.3.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { sendEmail } from '../../../lib/email';
import {
  logEmailEvent,
  getFeatureFlag,
} from '../../../lib/audiopro-lifecycle';
import {
  getDripCandidates,
  hasCollisionWithCRM,
  hasMailedRecently,
  pickTemplateForAudio,
} from '../../../lib/email-drip';

interface DripStats {
  audios_evaluated: number;
  mails_sent: number;
  skipped_collision: number;
  skipped_recent: number;
  skipped_no_template: number;
  errors: number;
  dry_run: boolean;
}

export const POST: APIRoute = async ({ request, url }) => {
  // ── Auth Vercel cron ───────────────────────────────────────
  const cronSecret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret) {
    console.error('[cron/email-drip] CRON_SECRET non configuré');
    return json({ error: 'CRON_SECRET non configuré côté serveur' }, 500);
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const dryRun = url.searchParams.get('dry_run') === 'true';
  const supabase = createServerClient();

  // ── Garde-fou : flag global ────────────────────────────────
  const dripEnabled = await getFeatureFlag<boolean>(supabase, 'email_drip_enabled', false);
  if (!dripEnabled) {
    console.log('[cron/email-drip] feature_flag email_drip_enabled=false → no-op');
    return json({
      message: 'Drip désactivé via feature_flags.email_drip_enabled',
      audios_evaluated: 0,
      mails_sent: 0,
      dry_run: dryRun,
    }, 200);
  }

  // ── Recompute lifecycle (transitions batch approuve→active, *→premium) ──
  // Sans bloquer si la fonction échoue (le drip peut continuer sur l'état actuel).
  try {
    await supabase.rpc('recompute_audiopro_lifecycle');
  } catch (err) {
    console.warn('[cron/email-drip] recompute_audiopro_lifecycle failed:', err);
  }

  // ── Boucle principale ──────────────────────────────────────
  const candidates = await getDripCandidates(supabase);
  const stats: DripStats = {
    audios_evaluated: candidates.length,
    mails_sent: 0,
    skipped_collision: 0,
    skipped_recent: 0,
    skipped_no_template: 0,
    errors: 0,
    dry_run: dryRun,
  };

  for (const audio of candidates) {
    try {
      // 1. Anti-collision CRM
      if (await hasCollisionWithCRM(supabase, audio)) {
        stats.skipped_collision++;
        continue;
      }

      // 2. Limite 1 mail nurture par semaine
      if (await hasMailedRecently(supabase, audio.id)) {
        stats.skipped_recent++;
        continue;
      }

      // 3. Choix du template à envoyer (premier match dans l'ordre §7.1)
      const choice = await pickTemplateForAudio(supabase, audio);
      if (!choice) {
        stats.skipped_no_template++;
        continue;
      }

      // 4. Dry-run : log only
      if (dryRun) {
        console.log(`[cron/email-drip] DRY-RUN ${audio.email} → ${choice.template_key} (${choice.subject})`);
        stats.mails_sent++;  // compte comme envoi virtuel
        continue;
      }

      // 5. Envoi réel + log + interaction si prospect lié
      const emailResult = await sendEmail({
        to: audio.email,
        subject: choice.subject,
        html: choice.html,
        replyTo: 'franckolivier@leguideauditif.fr',
      });

      if (!emailResult.success) {
        console.error(`[cron/email-drip] envoi échoué pour ${audio.email}:`, emailResult.error);
        stats.errors++;
        continue;
      }

      await logEmailEvent(supabase, {
        audiopro_id: audio.id,
        centre_slug: null,
        recipient_email: audio.email,
        template_key: choice.template_key,
        resend_message_id: emailResult.messageId ?? null,
        trigger: 'cron',
      });

      // Trace dans la timeline CRM si l'audio est promu prospect
      if (audio.prospect_id) {
        await supabase.from('prospect_interactions').insert({
          prospect_id: audio.prospect_id,
          kind: 'email',
          content: `Drip auto envoyé : ${choice.template_key}`,
          occurred_at: new Date().toISOString(),
        });
      }

      stats.mails_sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cron/email-drip] erreur sur audio ${audio.id}:`, msg);
      stats.errors++;
    }
  }

  console.log('[cron/email-drip] Run terminé:', stats);
  return json(stats, 200);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
