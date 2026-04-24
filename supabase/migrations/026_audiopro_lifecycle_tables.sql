-- ============================================================
-- Migration 026 : Tables du pipeline email revendicateurs (Phase 1)
-- Date         : 2026-04-24
-- PRD          : docs/phase1-email-pipeline/prd-email-pipeline-revendicateurs.md v1.1
-- Specs data   : docs/phase1-email-pipeline/specs-phase1-data.md v1.0
-- ============================================================
-- Crée 5 tables :
--   - audiopro_lifecycle         (entité canonique de l'audio, par email)
--   - audiopro_centres           (liaison N-N audio ↔ centres)
--   - audiopro_lifecycle_events  (historique append-only des transitions)
--   - email_events               (journal append-only des envois email)
--   - feature_flags              (config runtime drip + slots Fondateurs)
--
-- Triggers updated_at câblés sur public.update_updated_at() existant
-- (défini migration 001, partagé avec prospects / contacts / tasks).
--
-- RLS activé en migration 028 (service_role only en Phase 1).
-- Migration idempotente — toutes les créations sont IF NOT EXISTS.
-- ============================================================

-- --- Extensions requises ---
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Table audiopro_lifecycle
-- ============================================================
-- Entité de premier rang : un professionnel identifié par son email.
-- Un audio qui revendique plusieurs centres = UNE seule ligne ici.
-- ============================================================
CREATE TABLE IF NOT EXISTS audiopro_lifecycle (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            CITEXT UNIQUE NOT NULL,
  nom              TEXT,
  prenom           TEXT,
  adeli            TEXT,
  rpps             TEXT,

  lifecycle_stage  TEXT NOT NULL DEFAULT 'revendique',
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  first_claim_at   TIMESTAMPTZ,
  last_login_at    TIMESTAMPTZ,

  email_unsubscribed_at   TIMESTAMPTZ,
  email_preferences_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  prospect_id      UUID REFERENCES prospects(id) ON DELETE SET NULL,

  -- Marqueur bounce permanent (alimenté en Phase 2 par le webhook Resend)
  hard_bounced_at  TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT audiopro_lifecycle_stage_check
    CHECK (lifecycle_stage IN ('revendique','approuve','active','engage','premium','churned'))
);

-- --- Trigger updated_at (réutilise public.update_updated_at() de la 001) ---
DROP TRIGGER IF EXISTS trg_audiopro_lifecycle_updated_at ON audiopro_lifecycle;
CREATE TRIGGER trg_audiopro_lifecycle_updated_at
  BEFORE UPDATE ON audiopro_lifecycle
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- --- Indexes ---
CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_stage
  ON audiopro_lifecycle(lifecycle_stage);

CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_stage_changed
  ON audiopro_lifecycle(stage_changed_at);

CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_rpps
  ON audiopro_lifecycle(rpps)
  WHERE rpps IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_prospect
  ON audiopro_lifecycle(prospect_id)
  WHERE prospect_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_unsubscribed
  ON audiopro_lifecycle(email_unsubscribed_at)
  WHERE email_unsubscribed_at IS NOT NULL;

-- --- Commentaires sémantiques ---
COMMENT ON TABLE audiopro_lifecycle IS
  'Entité canonique d''un audioprothésiste revendicateur, identifiée par email. UPSERT à chaque nouveau claim. Séparée du CRM commercial (prospects).';

COMMENT ON COLUMN audiopro_lifecycle.email IS
  'Clé logique primaire (CITEXT, case-insensitive). UPSERT par email.';

COMMENT ON COLUMN audiopro_lifecycle.rpps IS
  'Clé secondaire. Alimentée si claimed_by_adeli matche ^\d{11}$ au moment du claim. Sinon NULL (backfill possible via centre_audios en Phase 2).';

COMMENT ON COLUMN audiopro_lifecycle.lifecycle_stage IS
  'Stage machine automatique : revendique → approuve → active → engage → premium → churned. Séparé du pipeline commercial (prospects.status).';

COMMENT ON COLUMN audiopro_lifecycle.prospect_id IS
  'FK vers prospects si l''audio a été promu en prospect commercial. NULL sinon. Déclenche la règle de collision (skip drip).';

COMMENT ON COLUMN audiopro_lifecycle.email_preferences_token IS
  'Token public pour /email-preferences (pas d''auth requise pour unsub). Généré à la création.';

COMMENT ON COLUMN audiopro_lifecycle.hard_bounced_at IS
  'Bounce permanent détecté par Resend (Phase 2). Quand set, les relances sont bloquées.';


-- ============================================================
-- Table audiopro_centres (liaison N-N)
-- ============================================================
-- Un audio peut revendiquer plusieurs centres (ex: Anthony Athuil = 3).
-- ============================================================
CREATE TABLE IF NOT EXISTS audiopro_centres (
  audiopro_id UUID NOT NULL REFERENCES audiopro_lifecycle(id) ON DELETE CASCADE,
  centre_id   UUID NOT NULL REFERENCES centres_auditifs(id) ON DELETE CASCADE,
  linked_via  TEXT NOT NULL,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (audiopro_id, centre_id),

  CONSTRAINT audiopro_centres_linked_via_check
    CHECK (linked_via IN ('claim','manual'))
);

CREATE INDEX IF NOT EXISTS idx_audiopro_centres_centre
  ON audiopro_centres(centre_id);

COMMENT ON TABLE audiopro_centres IS
  'Liaison N-N audio ↔ centres. Un audio peut revendiquer plusieurs centres, un centre est lié à 1 seul audio (FK centres_auditifs.claimed_by_email).';


-- ============================================================
-- Table audiopro_lifecycle_events (append-only)
-- ============================================================
-- Historique des transitions. Alimenté par trigger applicatif (helper TS)
-- et par la migration one-shot 029. Permet de calculer des délais moyens.
-- ============================================================
CREATE TABLE IF NOT EXISTS audiopro_lifecycle_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiopro_id UUID NOT NULL REFERENCES audiopro_lifecycle(id) ON DELETE CASCADE,
  from_stage  TEXT,
  to_stage    TEXT NOT NULL,
  reason      TEXT,
  metadata    JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audiopro_events_audiopro
  ON audiopro_lifecycle_events(audiopro_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audiopro_events_reason
  ON audiopro_lifecycle_events(reason);

COMMENT ON TABLE audiopro_lifecycle_events IS
  'Historique append-only des transitions de lifecycle_stage. Pas de DELETE ni UPDATE attendu.';

COMMENT ON COLUMN audiopro_lifecycle_events.reason IS
  'Raison métier : claim_submitted, claim_approved, claim_rejected, first_login_detected, completeness_threshold_reached, email_clicked, stripe_paid, stripe_paid_batch, stripe_cancelled, manual_override, migration_initiale, migration_premium_detected, promoted_to_prospect.';


-- ============================================================
-- Table email_events (append-only journal)
-- ============================================================
-- Journal de TOUS les emails envoyés (transactionnels + nurture + manuels).
-- Les colonnes delivered_at/opened_at/clicked_at/bounced_at/complaint_at
-- sont mises à jour par le webhook Resend en Phase 2.
-- ============================================================
CREATE TABLE IF NOT EXISTS email_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiopro_id       UUID REFERENCES audiopro_lifecycle(id) ON DELETE SET NULL,
  centre_slug       TEXT,
  recipient_email   CITEXT NOT NULL,
  template_key      TEXT NOT NULL,
  resend_message_id TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  bounced_at        TIMESTAMPTZ,
  complaint_at      TIMESTAMPTZ,
  trigger           TEXT NOT NULL,
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT email_events_trigger_check
    CHECK (trigger IN ('cron','manual_admin','transactional','webhook_stripe'))
);

CREATE INDEX IF NOT EXISTS idx_email_events_audiopro
  ON email_events(audiopro_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_template
  ON email_events(template_key, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_resend_id
  ON email_events(resend_message_id)
  WHERE resend_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_events_recipient
  ON email_events(recipient_email, sent_at DESC);

COMMENT ON TABLE email_events IS
  'Journal append-only de tous les emails envoyés. Les champs delivered/opened/clicked/bounced/complaint sont mis à jour par webhook Resend (Phase 2).';

COMMENT ON COLUMN email_events.template_key IS
  'Identifiant du template. v1 : claim_confirmation, claim_approved, claim_rejected, claim_admin_notification, payment_confirmation, payment_admin_notification, subscription_cancelled, fiche_incomplete_relance, premium_welcome. Phase 2 : nurture_01..05.';

COMMENT ON COLUMN email_events.trigger IS
  'Origine de l''envoi : cron (drip auto), manual_admin (bouton relance), transactional (claim/approve), webhook_stripe (premium_welcome).';


-- ============================================================
-- Table feature_flags
-- ============================================================
-- Flags runtime modifiables sans redeploy (drip Fondateurs, slots max).
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --- Trigger updated_at ---
DROP TRIGGER IF EXISTS trg_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trg_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- --- Valeurs initiales (idempotent via ON CONFLICT) ---
INSERT INTO feature_flags (key, value) VALUES
  ('fondateurs_drip_enabled', 'true'::jsonb),
  ('fondateurs_slots_max',    '20'::jsonb),
  ('email_drip_enabled',      'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE feature_flags IS
  'Flags runtime modifiables sans redeploy. Ex : fondateurs_drip_enabled coupe le template nurture_02.';


-- ============================================================
-- Fin migration 026
-- ============================================================
