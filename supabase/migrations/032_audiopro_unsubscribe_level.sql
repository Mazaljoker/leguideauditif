-- ============================================================
-- Migration 032 : Niveau de désabonnement (soft / hard)
-- Date         : 2026-04-24
-- Phase        : 2 PR-c (page /email-preferences + footer unsub)
-- ============================================================
-- Ajoute la colonne `unsubscribe_level` à `audiopro_lifecycle` pour
-- distinguer 2 niveaux de désabonnement :
--
--   - NULL    : audio actif, reçoit nurture + transactionnels
--   - 'soft'  : ne reçoit plus les nurture/relances, reçoit encore
--               les transactionnels (claim_confirmation, claim_approved,
--               payment_*, subscription_cancelled)
--   - 'hard'  : ne reçoit absolument plus aucun mail (RGPD strict —
--               rare, déclenché par l'utilisateur sur la page
--               /email-preferences ou auto sur complaint Resend)
--
-- Pourquoi un text et pas un boolean : extensibilité. Si demain on
-- veut un 3e niveau (ex: 'transactional_only_critical'), on évite la
-- multiplication des colonnes booléennes.
-- ============================================================

ALTER TABLE audiopro_lifecycle
  ADD COLUMN IF NOT EXISTS unsubscribe_level TEXT;

ALTER TABLE audiopro_lifecycle
  DROP CONSTRAINT IF EXISTS audiopro_unsubscribe_level_check;
ALTER TABLE audiopro_lifecycle
  ADD CONSTRAINT audiopro_unsubscribe_level_check
  CHECK (unsubscribe_level IS NULL OR unsubscribe_level IN ('soft', 'hard'));

-- Backfill : tout audio avec email_unsubscribed_at non null est en 'soft'
-- par défaut (rétro-compat avec les éventuelles désinscriptions déjà en
-- base). Les hard sont uniquement déclenchés explicitement.
UPDATE audiopro_lifecycle
SET unsubscribe_level = 'soft'
WHERE email_unsubscribed_at IS NOT NULL
  AND unsubscribe_level IS NULL;

-- Index partiel pour les queries "audios désabonnés" (rare mais utile
-- côté admin et anti-bug du cron drip)
CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_unsubscribe_level
  ON audiopro_lifecycle(unsubscribe_level)
  WHERE unsubscribe_level IS NOT NULL;

COMMENT ON COLUMN audiopro_lifecycle.unsubscribe_level IS
  'NULL = actif. ''soft'' = pas de nurture, transactionnels OK. ''hard'' = aucun mail. Mis à jour via /email-preferences ou auto sur complaint Resend (Phase 2 PR-b).';

-- ============================================================
-- Fin migration 032
-- ============================================================
