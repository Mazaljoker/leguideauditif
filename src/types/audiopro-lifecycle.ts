/**
 * Types du pipeline lifecycle audio (Phase 1 email pipeline).
 *
 * Correspondance stricte avec :
 *   - supabase/migrations/026_audiopro_lifecycle_tables.sql
 *   - supabase/migrations/027_audiopro_completeness_fn.sql
 *   - supabase/migrations/030_audiopro_list_view.sql
 *
 * Docs :
 *   - docs/phase1-email-pipeline/prd-email-pipeline-revendicateurs.md
 *   - docs/phase1-email-pipeline/specs-phase1-data.md §5
 */

// ──────────────────────────────────────────────────────────────
// Lifecycle stage
// ──────────────────────────────────────────────────────────────

export type LifecycleStage =
  | 'revendique'
  | 'approuve'
  | 'active'
  | 'engage'
  | 'premium'
  | 'churned';

export const LIFECYCLE_STAGES: readonly LifecycleStage[] = [
  'revendique',
  'approuve',
  'active',
  'engage',
  'premium',
  'churned',
] as const;

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  revendique: 'Revendiqué',
  approuve:   'Approuvé',
  active:     'Actif',
  engage:     'Engagé',
  premium:    'Premium',
  churned:    'Churné',
};

/**
 * Classes Tailwind (v4) pour les badges de stage.
 * Utilisé par AudioproStageBadge.astro (Étape 3).
 */
export const LIFECYCLE_STAGE_COLORS: Record<LifecycleStage, string> = {
  revendique: 'bg-stone-200 text-stone-800',
  approuve:   'bg-blue-100 text-blue-800',
  active:     'bg-amber-100 text-amber-800',
  engage:     'bg-orange-100 text-orange-800',
  premium:    'bg-emerald-100 text-emerald-800',
  churned:    'bg-red-100 text-red-800',
};

// ──────────────────────────────────────────────────────────────
// Entités principales
// ──────────────────────────────────────────────────────────────

export type LinkedVia = 'claim' | 'manual';

export interface AudioproLifecycle {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  adeli: string | null;
  rpps: string | null;

  lifecycle_stage: LifecycleStage;
  stage_changed_at: string;          // ISO timestamp

  first_claim_at: string | null;
  last_login_at: string | null;

  email_unsubscribed_at: string | null;
  email_preferences_token: string;   // UUID

  prospect_id: string | null;

  hard_bounced_at: string | null;

  /**
   * Fusion molle : pointe vers l'audio canonical si cette ligne est un
   * doublon. NULL = ligne active (visible dans v_audiopro_list). Migration 031.
   */
  merged_into_id: string | null;

  created_at: string;
  updated_at: string;
}

export interface AudioproCentre {
  audiopro_id: string;
  centre_id: string;
  linked_via: LinkedVia;
  linked_at: string;
}

export interface AudioproLifecycleEvent {
  id: string;
  audiopro_id: string;
  from_stage: LifecycleStage | null;
  to_stage: LifecycleStage;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

// ──────────────────────────────────────────────────────────────
// Email events
// ──────────────────────────────────────────────────────────────

/**
 * Clés de templates email.
 * En Phase 1, seuls les transactionnels existants + `fiche_incomplete_relance`
 * + `premium_welcome` sont effectivement utilisés.
 * Les nurture_01..05 sont déclarés ici pour le typage mais non implémentés
 * (activation Phase 2).
 */
export type EmailTemplateKey =
  // Transactionnels existants
  | 'claim_confirmation'
  | 'claim_approved'
  | 'claim_rejected'
  | 'claim_admin_notification'
  | 'payment_confirmation'
  | 'payment_admin_notification'
  | 'subscription_cancelled'
  // Phase 1 — nouveaux
  | 'fiche_incomplete_relance'
  | 'premium_welcome'
  // Phase 2 — déclarés pour le typage seulement
  | 'nurture_01_premiers_patients'
  | 'nurture_02_offre_fondateurs'
  | 'nurture_03_cas_concret'
  | 'nurture_04_slots_restants'
  | 'nurture_05_ads_ou_sortie';

export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  claim_confirmation:            'Confirmation de revendication',
  claim_approved:                'Validation de la fiche',
  claim_rejected:                'Rejet de la revendication',
  claim_admin_notification:      'Notification admin claim',
  payment_confirmation:          'Confirmation de paiement',
  payment_admin_notification:    'Notification admin paiement',
  subscription_cancelled:        'Annulation abonnement',
  fiche_incomplete_relance:      'Relance complétude de fiche',
  premium_welcome:               'Bienvenue Premium',
  nurture_01_premiers_patients:  'Nurture 01 — Premiers patients',
  nurture_02_offre_fondateurs:   'Nurture 02 — Offre Fondateurs',
  nurture_03_cas_concret:        'Nurture 03 — Étude de cas',
  nurture_04_slots_restants:     'Nurture 04 — Slots restants',
  nurture_05_ads_ou_sortie:      'Nurture 05 — Ads ou sortie',
};

export type EmailTrigger =
  | 'cron'
  | 'manual_admin'
  | 'transactional'
  | 'webhook_stripe';

export interface EmailEvent {
  id: string;
  audiopro_id: string | null;
  centre_slug: string | null;
  recipient_email: string;
  template_key: EmailTemplateKey;
  resend_message_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complaint_at: string | null;
  trigger: EmailTrigger;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ──────────────────────────────────────────────────────────────
// Complétude / champs manquants
// ──────────────────────────────────────────────────────────────

/**
 * Retour de la fonction SQL audiopro_missing_fields().
 * Les `missing_fields` sont les clés `CompletenessField` ; le mapping
 * vers les labels FR est dans `COMPLETENESS_FIELD_LABELS`.
 */
export interface AudioproMissingField {
  centre_id: string;
  centre_slug: string;
  centre_nom: string;
  completeness_pct: number;
  missing_fields: CompletenessField[];
}

export type CompletenessField =
  | 'tel'
  | 'site_web'
  | 'a_propos'
  | 'photo_url'
  | 'email'
  | 'specialites'
  | 'marques';

export const COMPLETENESS_FIELD_LABELS: Record<CompletenessField, string> = {
  tel:         'Téléphone',
  site_web:    'Site web',
  a_propos:    'Description',
  photo_url:   'Photo',
  email:       'E-mail',
  specialites: 'Spécialités',
  marques:     'Marques',
};

// ──────────────────────────────────────────────────────────────
// Vue agrégée /admin/claims (v_audiopro_list)
// ──────────────────────────────────────────────────────────────

export interface AudioproListRow {
  audiopro_id: string;
  email: string;
  prenom: string | null;
  nom: string | null;

  lifecycle_stage: LifecycleStage;
  stage_changed_at: string;

  first_claim_at: string | null;

  nb_centres: number;
  completeness_avg: number;                  // 0..100
  claim_status_summary: string | null;       // ex: "2 approved / 1 pending"

  last_email_template: EmailTemplateKey | null;
  last_email_sent_at: string | null;
  last_email_clicked_at: string | null;
  emails_sent_30d: number;

  prospect_id: string | null;
  prospect_status: string | null;            // cf. prospects.status

  email_unsubscribed_at: string | null;
  hard_bounced_at: string | null;
}
