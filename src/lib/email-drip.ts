/**
 * Logique de matching audio → template pour le cron drip Phase 2.
 *
 * Helpers purs et testables : aucune dépendance au runtime Vercel/Astro,
 * juste un SupabaseClient. Permet d'écrire des tests Playwright e2e
 * qui simulent un audio donné et vérifient le template choisi sans
 * lancer le cron entier.
 *
 * Référence : PRD §6 (collisions CRM) + §7 (séquence drip).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  AudioproLifecycle,
  AudioproMissingField,
  EmailTemplateKey,
  LifecycleStage,
} from '../types/audiopro-lifecycle';
import { getAudioproMissingFields, getSlotsFondateursRestants, getFeatureFlag } from './audiopro-lifecycle';

import { nurture01PremiersPatientsEmail } from '../emails/nurture-01-premiers-patients';
import { ficheIncompleteRelanceEmail } from '../emails/fiche-incomplete-relance';
import { nurture02OffreFondateursEmail } from '../emails/nurture-02-offre-fondateurs';
import { nurture03CasConcretEmail } from '../emails/nurture-03-cas-concret';
import { nurture04SlotsRestantsEmail } from '../emails/nurture-04-slots-restants';
import { nurture05AdsOuSortieEmail } from '../emails/nurture-05-ads-ou-sortie';
import { nouvelEspaceProAnnonceEmail } from '../emails/nouvel-espace-pro-annonce';

// ────────────────────────────────────────────────────────────
// Constantes éditoriales — ancienneté minimale par template
// ────────────────────────────────────────────────────────────

const DAYS = 24 * 60 * 60 * 1000;

interface TemplateRule {
  key: EmailTemplateKey;
  minStageAgeDays: number;
  allowedStages: LifecycleStage[];
}

/**
 * Ordre prioritaire — séquence "valeur avant offre" (décision 2026-04-27).
 * Si plusieurs templates matchent au même run, on prend le premier.
 * La règle "1 mail par audio par run" est appliquée par le caller (cron) —
 * ce module se contente de retourner le 1er match.
 *
 * Logique éditoriale en pair-à-pair :
 *  1. nurture_01 (J+3)  — premiers repères onboarding
 *  2. nurture_03 (J+7)  — méthode 3 points (valeur)
 *  3. fiche_incomplete (J+10) — pratique, si fiche pas finie
 *  4. nurture_02 (J+14) — offre Fondateurs (après 2 emails de valeur)
 *  5. nurture_04 (J+21) — relance offre, slots restants
 *  6. nurture_05 (J+30) — dernière relance (ads ou sortie)
 *
 * Drip total compressé sur ~30 jours (vs J+45 historique). Combiné avec
 * un cron Lundi+Jeudi (vercel.json) et MIN_DAYS_BETWEEN_MAILS=3, on
 * obtient ~6 mails étalés sur 4 semaines, max 4 jours d'écart.
 */
export const TEMPLATE_RULES: readonly TemplateRule[] = [
  { key: 'nurture_01_premiers_patients', minStageAgeDays: 3,  allowedStages: ['approuve'] },
  { key: 'nurture_03_cas_concret',       minStageAgeDays: 7,  allowedStages: ['approuve', 'active', 'engage'] },
  { key: 'fiche_incomplete_relance',     minStageAgeDays: 10, allowedStages: ['approuve', 'active'] },
  { key: 'nurture_02_offre_fondateurs',  minStageAgeDays: 14, allowedStages: ['approuve', 'active', 'engage'] },
  { key: 'nurture_04_slots_restants',    minStageAgeDays: 21, allowedStages: ['approuve', 'active', 'engage'] },
  { key: 'nurture_05_ads_ou_sortie',     minStageAgeDays: 30, allowedStages: ['approuve', 'active', 'engage'] },
];

/**
 * Cooldown minimum entre 2 mails nurture/manuels pour un même audio.
 * 3 jours = compatible avec un cron Lundi+Jeudi (écart Mon→Thu=3, Thu→Mon=4).
 * Décision Franck-Olivier 2026-04-27 : compresser le drip pour engager
 * plus tôt, avec valeur avant offre.
 */
export const MIN_DAYS_BETWEEN_MAILS = 3;

// ────────────────────────────────────────────────────────────
// Eligibilité : audios candidats au drip
// ────────────────────────────────────────────────────────────

/**
 * Liste les audios potentiellement éligibles au drip (1er filtre SQL).
 * Les filtres fins (collision CRM, dernier mail, conditions par template)
 * sont appliqués par audio dans `pickTemplateForAudio`.
 *
 * Exclusions de base :
 *  - merged_into_id IS NOT NULL   → doublon fusionné (PR #90)
 *  - email_unsubscribed_at SET    → désabonné soft
 *  - hard_bounced_at SET          → bounce permanent
 *  - lifecycle_stage premium/churned → hors pipeline (décision Franck)
 */
export async function getDripCandidates(
  supabase: SupabaseClient,
): Promise<AudioproLifecycle[]> {
  const { data, error } = await supabase
    .from('audiopro_lifecycle')
    .select('*')
    .is('merged_into_id', null)
    .is('email_unsubscribed_at', null)
    .is('hard_bounced_at', null)
    .in('lifecycle_stage', ['approuve', 'active', 'engage']);

  if (error) {
    console.error('[email-drip] getDripCandidates failed:', error.message);
    return [];
  }
  return (data ?? []) as AudioproLifecycle[];
}

// ────────────────────────────────────────────────────────────
// Collision CRM (§6 PRD) — skip drip si vrai
// ────────────────────────────────────────────────────────────

/**
 * Vrai = skip drip. L'audio est suivi à la main par Franck-Olivier.
 * Conditions §6 PRD :
 *  1. prospect actif (status IN contacte/rdv/proposition)
 *  2. interaction humaine récente (<14j, kind ≠ email)
 *  3. tâche CRM ouverte
 *
 * (Désabonnement géré séparément via `email_unsubscribed_at`.)
 */
export async function hasCollisionWithCRM(
  supabase: SupabaseClient,
  audiopro: AudioproLifecycle,
): Promise<boolean> {
  if (!audiopro.prospect_id) return false;

  // Condition 1 : prospect actif
  const { data: prospect } = await supabase
    .from('prospects')
    .select('status')
    .eq('id', audiopro.prospect_id)
    .maybeSingle();

  if (prospect && ['contacte', 'rdv', 'proposition'].includes(prospect.status as string)) {
    return true;
  }

  // Condition 2 : interaction humaine <14j (exclut kind='email' = drip lui-même)
  const fourteenDaysAgo = new Date(Date.now() - 14 * DAYS).toISOString();
  const { count: humanInteractions } = await supabase
    .from('prospect_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('prospect_id', audiopro.prospect_id)
    .in('kind', ['dm', 'call', 'meeting', 'note', 'transcript_meet', 'transcript_call'])
    .gte('occurred_at', fourteenDaysAgo);

  if ((humanInteractions ?? 0) > 0) return true;

  // Condition 3 : tâche CRM ouverte
  const { count: openTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('owner_type', 'prospect')
    .eq('owner_id', audiopro.prospect_id)
    .eq('status', 'open');

  if ((openTasks ?? 0) > 0) return true;

  return false;
}

// ────────────────────────────────────────────────────────────
// Dernier mail nurture < N jours — skip si vrai
// ────────────────────────────────────────────────────────────

/**
 * Limite "1 mail par semaine". Vrai = on a déjà envoyé un nurture/manuel
 * dans les MIN_DAYS_BETWEEN_MAILS derniers jours → skip ce run.
 *
 * Les transactionnels (claim_confirmation, claim_approved, premium_welcome,
 * subscription_cancelled, claim_admin_notification) ne comptent PAS dans
 * cette limite — un audio qui paye et reçoit premium_welcome peut quand
 * même recevoir un nurture le lendemain (en pratique il sortira du drip
 * car il passe en stage='premium', mais c'est cohérent).
 */
const NON_DRIP_TEMPLATES: ReadonlySet<EmailTemplateKey> = new Set([
  'claim_confirmation',
  'claim_approved',
  'claim_rejected',
  'claim_admin_notification',
  'payment_confirmation',
  'payment_admin_notification',
  'subscription_cancelled',
  'premium_welcome',
]);

export async function hasMailedRecently(
  supabase: SupabaseClient,
  audiopro_id: string,
  days: number = MIN_DAYS_BETWEEN_MAILS,
): Promise<boolean> {
  const since = new Date(Date.now() - days * DAYS).toISOString();
  const { data } = await supabase
    .from('email_events')
    .select('template_key')
    .eq('audiopro_id', audiopro_id)
    .gte('sent_at', since);

  if (!data) return false;
  return data.some((row) => !NON_DRIP_TEMPLATES.has(row.template_key as EmailTemplateKey));
}

// ────────────────────────────────────────────────────────────
// Déjà envoyé ce template à cet audio ?
// ────────────────────────────────────────────────────────────

/**
 * Vrai = ce template a déjà été envoyé à cet audio. Permet de respecter
 * la règle PRD "1 envoi par template par audio" (sauf fiche_incomplete_relance
 * qui peut se renvoyer après 30j si la complétude n'a pas bougé).
 */
export async function hasReceivedTemplate(
  supabase: SupabaseClient,
  audiopro_id: string,
  template_key: EmailTemplateKey,
  withinDays?: number,
): Promise<boolean> {
  let query = supabase
    .from('email_events')
    .select('id', { count: 'exact', head: true })
    .eq('audiopro_id', audiopro_id)
    .eq('template_key', template_key);

  if (withinDays !== undefined) {
    const since = new Date(Date.now() - withinDays * DAYS).toISOString();
    query = query.gte('sent_at', since);
  }

  const { count } = await query;
  return (count ?? 0) > 0;
}

// ────────────────────────────────────────────────────────────
// Choix du template à envoyer pour un audio donné
// ────────────────────────────────────────────────────────────

export interface DripChoice {
  template_key: EmailTemplateKey;
  subject: string;
  html: string;
}

/**
 * Pour un audio donné, applique l'ordre §7.1 et retourne le 1er template
 * qui matche, ou null si aucun.
 *
 * Conditions par template (§7.4 PRD) :
 *  - nurture_01 : stage approuve depuis ≥ 3j, jamais envoyé
 *  - fiche_incomplete : stage approuve/active ≥ 10j, ≥ 1 centre <80%, pas
 *    envoyé dans les 30 derniers jours
 *  - nurture_02 : stage approuve/active/engage ≥ 7j, fondateurs_drip=true,
 *    slots > 0, jamais envoyé
 *  - nurture_03 : stage * ≥ 14j (au moins 14j depuis l'entrée approuve),
 *    jamais envoyé
 *  - nurture_04 : 21j depuis approuve, fondateurs_drip=true, slots ≤ 5,
 *    jamais envoyé
 *  - nurture_05 : 45j depuis approuve, stage ≠ premium, jamais envoyé
 */
export async function pickTemplateForAudio(
  supabase: SupabaseClient,
  audiopro: AudioproLifecycle,
): Promise<DripChoice | null> {
  // Ancienneté = depuis stage_changed_at (proxy raisonnable de "depuis approuve")
  const stageAgeDays =
    (Date.now() - new Date(audiopro.stage_changed_at).getTime()) / DAYS;

  // Charger les centres / missing fields une fois (réutilisé par plusieurs templates)
  const missing = await getAudioproMissingFields(supabase, audiopro.id);

  // Slots Fondateurs / flag
  const fondateursEnabled = await getFeatureFlag<boolean>(
    supabase,
    'fondateurs_drip_enabled',
    true,
  );
  const slotsRestants = fondateursEnabled
    ? await getSlotsFondateursRestants(supabase)
    : 0;

  for (const rule of TEMPLATE_RULES) {
    // Filtre stage + ancienneté
    if (!rule.allowedStages.includes(audiopro.lifecycle_stage)) continue;
    if (stageAgeDays < rule.minStageAgeDays) continue;

    // Conditions spécifiques par template
    switch (rule.key) {
      case 'nurture_01_premiers_patients': {
        if (await hasReceivedTemplate(supabase, audiopro.id, rule.key)) continue;
        return buildChoice(rule.key, audiopro, { missing });
      }

      case 'fiche_incomplete_relance': {
        // ≥ 1 centre < 80%
        const hasIncomplete = missing.some((m) => m.completeness_pct < 80 && m.missing_fields.length > 0);
        if (!hasIncomplete) continue;
        // Renvoyable après 30j (cf. PRD §7.1 ligne "complétude 100% ou déjà envoyé dans les 30j")
        const sentRecently = await hasReceivedTemplate(supabase, audiopro.id, rule.key, 30);
        if (sentRecently) continue;
        return buildChoice(rule.key, audiopro, { missing });
      }

      case 'nurture_02_offre_fondateurs': {
        if (!fondateursEnabled) continue;
        if (slotsRestants <= 0) continue;
        if (await hasReceivedTemplate(supabase, audiopro.id, rule.key)) continue;
        return buildChoice(rule.key, audiopro, { slotsRestants });
      }

      case 'nurture_03_cas_concret': {
        if (await hasReceivedTemplate(supabase, audiopro.id, rule.key)) continue;
        return buildChoice(rule.key, audiopro, {});
      }

      case 'nurture_04_slots_restants': {
        if (!fondateursEnabled) continue;
        if (slotsRestants <= 0 || slotsRestants > 5) continue;
        if (await hasReceivedTemplate(supabase, audiopro.id, rule.key)) continue;
        return buildChoice(rule.key, audiopro, { slotsRestants });
      }

      case 'nurture_05_ads_ou_sortie': {
        if (await hasReceivedTemplate(supabase, audiopro.id, rule.key)) continue;
        return buildChoice(rule.key, audiopro, {});
      }

      default:
        continue;
    }
  }

  return null;
}

// ────────────────────────────────────────────────────────────
// Builder HTML + subject par template
// ────────────────────────────────────────────────────────────

/**
 * Inputs partagés par template. Selon le template choisi, certains champs
 * sont obligatoires :
 *  - `missing` requis pour `fiche_incomplete_relance` et `nurture_01`
 *  - `slotsRestants` requis pour `nurture_02` et `nurture_04`
 * Les autres templates ignorent ces champs.
 *
 * Le caller doit pré-fetcher ces données — ainsi le cron n'appelle qu'une
 * fois `getAudioproMissingFields` / `getSlotsFondateursRestants` même si
 * plusieurs templates sont évalués pour le même audio.
 */
export interface BuilderInputs {
  missing?: AudioproMissingField[];
  slotsRestants?: number;
}

/**
 * Construit le couple `{subject, html}` pour un template donné. Utilisé
 * par le cron drip (`pickTemplateForAudio`) ET par l'endpoint admin
 * (`/api/admin/relance-email`). Pas de validation métier ici (collisions,
 * désabonnement, complétude) — le caller décide d'envoyer ou pas.
 *
 * Lance pour les templates non supportés (transactionnels webhook,
 * `premium_welcome`) — c'est volontaire : ces templates ont leur propre
 * point d'entrée et ne doivent pas pouvoir partir d'ici.
 */
export function buildEmailForTemplate(
  template_key: EmailTemplateKey,
  audiopro: AudioproLifecycle,
  inputs: BuilderInputs,
): DripChoice {
  const prenom = audiopro.prenom ?? '';
  const unsubscribeToken = audiopro.email_preferences_token;

  switch (template_key) {
    case 'nurture_01_premiers_patients': {
      const missing = inputs.missing ?? [];
      const nbCentres = Math.max(1, missing.length);
      const completenessAvg = missing.length > 0
        ? Math.round(missing.reduce((a, m) => a + m.completeness_pct, 0) / missing.length)
        : 0;
      const primarySlug = missing[0]?.centre_slug ?? '';
      return {
        template_key,
        subject: 'Vos premiers patients sur LeGuideAuditif — quelques repères',
        html: nurture01PremiersPatientsEmail({
          prenom,
          nbCentres,
          completenessAvg,
          primaryCentreSlug: primarySlug,
          unsubscribeToken,
        }),
      };
    }

    case 'fiche_incomplete_relance': {
      const missing = inputs.missing ?? [];
      const incomplete = missing.filter((m) => m.missing_fields.length > 0);
      const nb = incomplete.length;
      const subject = nb === 1
        ? 'Il manque quelques infos sur votre fiche'
        : `Il manque des infos sur ${nb} de vos fiches`;
      return {
        template_key,
        subject,
        html: ficheIncompleteRelanceEmail({ prenom, centres: missing, unsubscribeToken }),
      };
    }

    case 'nurture_02_offre_fondateurs': {
      const slots = inputs.slotsRestants ?? 0;
      return {
        template_key,
        subject: `Programme Partenaires Fondateurs — ${slots} place${slots > 1 ? 's' : ''} restante${slots > 1 ? 's' : ''}`,
        html: nurture02OffreFondateursEmail({ prenom, slotsRestants: slots, unsubscribeToken }),
      };
    }

    case 'nurture_03_cas_concret':
      return {
        template_key,
        subject: 'Trois choses qui changent la perception côté patient',
        html: nurture03CasConcretEmail({ prenom, unsubscribeToken }),
      };

    case 'nurture_04_slots_restants': {
      const slots = inputs.slotsRestants ?? 0;
      return {
        template_key,
        subject: `Plus que ${slots} place${slots > 1 ? 's' : ''} Fondateurs`,
        html: nurture04SlotsRestantsEmail({ prenom, slotsRestants: slots, unsubscribeToken }),
      };
    }

    case 'nurture_05_ads_ou_sortie':
      return {
        template_key,
        subject: 'Des RDV patients ou vous restez en vitrine ?',
        html: nurture05AdsOuSortieEmail({ prenom, unsubscribeToken }),
      };

    case 'nouvel_espace_pro_annonce':
      return {
        template_key,
        subject: 'Votre espace pro LeGuideAuditif a été refondu',
        html: nouvelEspaceProAnnonceEmail({ prenom, unsubscribeToken }),
      };

    default:
      // Templates transactionnels (claim_*, payment_*, subscription_cancelled,
      // premium_welcome) ont leur propre point d'entrée — pas de relance manuelle.
      throw new Error(`buildEmailForTemplate: template non supporté — ${template_key}`);
  }
}

/**
 * Wrapper interne pour le cron drip — préserve le nom historique.
 * Les templates drip-ables ne sont qu'un sous-ensemble de ce que
 * `buildEmailForTemplate` accepte (le cron ne sert pas `nouvel_espace_pro_annonce`).
 */
function buildChoice(
  template_key: EmailTemplateKey,
  audiopro: AudioproLifecycle,
  inputs: BuilderInputs,
): DripChoice {
  return buildEmailForTemplate(template_key, audiopro, inputs);
}
