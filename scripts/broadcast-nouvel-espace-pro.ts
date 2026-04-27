/**
 * Broadcast one-shot du template `nouvel_espace_pro_annonce` à tous les
 * audios actifs (approuve/active/engage), non désabonnés, non bouncés,
 * non en collision CRM.
 *
 * Usage :
 *   npx tsx scripts/broadcast-nouvel-espace-pro.ts            # DRY-RUN (par défaut)
 *   npx tsx scripts/broadcast-nouvel-espace-pro.ts --execute  # ENVOI RÉEL
 *
 * Le dry-run est OBLIGATOIRE par défaut — il faut explicitement passer
 * --execute pour déclencher l'envoi. Aucun audio n'est touché en dry-run :
 * juste la liste cible affichée.
 *
 * Logique d'éligibilité (alignée sur getDripCandidates + collision CRM) :
 *  - merged_into_id IS NULL
 *  - email_unsubscribed_at IS NULL
 *  - hard_bounced_at IS NULL
 *  - lifecycle_stage IN ('approuve','active','engage')
 *  - skip si hasCollisionWithCRM (prospect status contacte/rdv/proposition,
 *    interaction humaine <14j, ou tâche ouverte)
 *
 * Une fois envoyé, log dans email_events avec trigger='manual_admin' →
 * le cron drip respectera la règle MIN_DAYS_BETWEEN_MAILS=7 et muselera
 * sa séquence pour ces audios pendant 7 jours.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

import { nouvelEspaceProAnnonceEmail } from '../src/emails/nouvel-espace-pro-annonce';
import {
  hasCollisionWithCRM,
  getDripCandidates,
} from '../src/lib/email-drip';
import { logEmailEvent } from '../src/lib/audiopro-lifecycle';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env');
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY requis dans .env');
  process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const FROM = 'Franck-Olivier — LeGuideAuditif <franckolivier@leguideauditif.fr>';
const SUBJECT = 'Votre espace pro LeGuideAuditif a été refondu';

async function main() {
  console.log(isExecute
    ? '[broadcast] MODE ENVOI RÉEL — 38 mails Resend partent en quelques minutes'
    : '[broadcast] MODE DRY-RUN — aucun envoi, aucune écriture DB'
  );
  console.log('');

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);
  const resend = new Resend(RESEND_API_KEY!);

  const candidates = await getDripCandidates(supabase);
  console.log(`[broadcast] ${candidates.length} audios candidats (filtre getDripCandidates)`);

  const eligible: typeof candidates = [];
  const skipped: { email: string; reason: string }[] = [];

  for (const audio of candidates) {
    const collision = await hasCollisionWithCRM(supabase, audio);
    if (collision) {
      skipped.push({ email: audio.email, reason: 'collision_crm' });
      continue;
    }
    eligible.push(audio);
  }

  console.log(`[broadcast] ${eligible.length} audios éligibles, ${skipped.length} skippés`);
  console.log('');

  // Liste détaillée
  console.log('=== Skip (collision CRM) ===');
  for (const s of skipped) {
    console.log(`  SKIP ${s.email} (${s.reason})`);
  }
  console.log('');
  console.log('=== Cible broadcast ===');
  for (const a of eligible) {
    const stageDays = Math.round(
      (Date.now() - new Date(a.stage_changed_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    console.log(
      `  ${(a.prenom ?? '?').padEnd(15)} ${(a.nom ?? '?').padEnd(20)} ${a.email.padEnd(40)} ${a.lifecycle_stage} J+${stageDays}`,
    );
  }
  console.log('');

  if (!isExecute) {
    console.log('=== DRY-RUN terminé ===');
    console.log(`Lance avec --execute pour envoyer ${eligible.length} mails.`);
    return;
  }

  // Envoi réel
  console.log('=== Envoi en cours ===');
  let sent = 0;
  let failed = 0;
  for (const audio of eligible) {
    try {
      const html = nouvelEspaceProAnnonceEmail({
        prenom: audio.prenom ?? '',
        unsubscribeToken: audio.email_preferences_token,
      });

      const { data, error } = await resend.emails.send({
        from: FROM,
        to: [audio.email],
        subject: SUBJECT,
        html,
        replyTo: 'franckolivier@leguideauditif.fr',
      });

      if (error) {
        console.error(`  [X] ${audio.email} — ${error.message}`);
        failed++;
      } else {
        console.log(`  [OK] ${audio.email} — messageId=${data?.id ?? '?'}`);
        sent++;

        // Log email_event pour activer la règle MIN_DAYS_BETWEEN_MAILS du cron
        await logEmailEvent(supabase, {
          audiopro_id: audio.id,
          centre_slug: null,
          recipient_email: audio.email,
          template_key: 'nouvel_espace_pro_annonce',
          resend_message_id: data?.id ?? null,
          trigger: 'manual_admin',
        });
      }

      // Rate limit courtois (Resend tolère bien plus, mais on reste raisonnables)
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [X] ${audio.email} — ${msg}`);
      failed++;
    }
  }

  console.log('');
  console.log(`=== Terminé : ${sent} envoyés, ${failed} échecs ===`);
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
