-- ============================================================
-- Migration 029 : Backfill des ~43 revendicateurs existants
-- Date         : 2026-04-24
-- Specs data   : docs/phase1-email-pipeline/specs-phase1-data.md v1.0 §4
-- ============================================================
-- Script one-shot IDEMPOTENT. Peut être rejoué sans casser la base :
-- tous les INSERT portent un ON CONFLICT DO NOTHING ou un NOT EXISTS.
--
-- 4 étapes :
--   1. INSERT audiopro_lifecycle — une ligne par email unique dans
--      centres_auditifs.claimed_by_email (DISTINCT ON).
--   2. INSERT audiopro_centres — liaison N-N audio ↔ centres.
--   3. INSERT lifecycle_events — backfill transition initiale
--      (NULL → lifecycle_stage) avec reason='migration_initiale'.
--   4. INSERT lifecycle_events — pour les centres déjà premium,
--      event supplémentaire (approuve → premium) avec reason=
--      'migration_premium_detected' pour traçabilité funnel.
--
-- NOTE rpps : la colonne centres_auditifs.rpps N'EXISTE PAS. Le RPPS
-- est hissé uniquement quand claimed_by_adeli matche ^\d{11}$
-- (fallback NULL sinon — backfill via centre_audios prévu Phase 2).
--
-- NOTE heuristique nom/prénom : split_part sur le premier espace.
-- Les cas tordus (noms composés type "Curie-Skłodowska", "de la Fontaine")
-- sortiront mal split. Correction manuelle via /admin/claims en Étape 3.
-- ============================================================

-- ============================================================
-- Étape 1 : créer une ligne audiopro_lifecycle par email unique
-- ============================================================
INSERT INTO audiopro_lifecycle (
  email, nom, prenom, adeli, rpps,
  lifecycle_stage, stage_changed_at, first_claim_at, created_at, updated_at
)
SELECT DISTINCT ON (LOWER(claimed_by_email))
  LOWER(claimed_by_email) AS email,
  -- Heuristique nom/prénom : split sur le premier espace.
  -- "Jean Dupont" → prenom="Jean", nom="Dupont"
  -- "Jean"        → prenom="Jean", nom=NULL
  CASE
    WHEN position(' ' IN claimed_by_name) > 0
    THEN substring(claimed_by_name FROM position(' ' IN claimed_by_name) + 1)
    ELSE NULL
  END AS nom,
  CASE
    WHEN position(' ' IN claimed_by_name) > 0
    THEN substring(claimed_by_name FROM 1 FOR position(' ' IN claimed_by_name) - 1)
    ELSE claimed_by_name
  END AS prenom,
  claimed_by_adeli AS adeli,
  -- RPPS fallback NULL : uniquement si claimed_by_adeli matche 11 chiffres
  CASE WHEN claimed_by_adeli ~ '^\d{11}$' THEN claimed_by_adeli ELSE NULL END AS rpps,
  CASE
    WHEN plan = 'premium'            THEN 'premium'
    WHEN claim_status = 'approved'   THEN 'approuve'
    WHEN claim_status = 'pending'    THEN 'revendique'
    WHEN claim_status = 'rejected'   THEN 'revendique'  -- trace, pas de stage dédié
    ELSE 'revendique'
  END AS lifecycle_stage,
  COALESCE(claimed_at, NOW()) AS stage_changed_at,
  claimed_at                  AS first_claim_at,
  COALESCE(claimed_at, NOW()) AS created_at,
  COALESCE(claimed_at, NOW()) AS updated_at
FROM centres_auditifs
WHERE claimed_by_email IS NOT NULL
  AND TRIM(claimed_by_email) != ''
ORDER BY LOWER(claimed_by_email), claimed_at ASC
ON CONFLICT (email) DO NOTHING;


-- ============================================================
-- Étape 2 : lier chaque centre à son audiopro
-- ============================================================
INSERT INTO audiopro_centres (audiopro_id, centre_id, linked_via, linked_at)
SELECT
  a.id,
  c.id,
  'claim',
  COALESCE(c.claimed_at, NOW())
FROM centres_auditifs c
JOIN audiopro_lifecycle a ON a.email = LOWER(c.claimed_by_email)
WHERE c.claimed_by_email IS NOT NULL
  AND TRIM(c.claimed_by_email) != ''
ON CONFLICT (audiopro_id, centre_id) DO NOTHING;


-- ============================================================
-- Étape 3 : backfill event initial (NULL → stage courant)
-- ============================================================
INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, occurred_at)
SELECT
  a.id,
  NULL,
  a.lifecycle_stage,
  'migration_initiale',
  a.stage_changed_at
FROM audiopro_lifecycle a
WHERE NOT EXISTS (
  SELECT 1 FROM audiopro_lifecycle_events e
  WHERE e.audiopro_id = a.id
    AND e.reason = 'migration_initiale'
);


-- ============================================================
-- Étape 4 : event migration_premium_detected (traçabilité funnel)
-- ============================================================
-- Pour les audios déjà en stage='premium' (posés par l'étape 1 via le
-- CASE plan='premium'), ajouter un event approuve → premium pour
-- matérialiser qu'ils sont passés par l'étape approuve logiquement.
-- Pas d'UPDATE sur audiopro_lifecycle ici — juste un event en plus.
-- ============================================================
INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, occurred_at)
SELECT DISTINCT
  a.id,
  'approuve',
  'premium',
  'migration_premium_detected',
  COALESCE(c.premium_since, c.claimed_at, NOW())
FROM audiopro_lifecycle a
JOIN audiopro_centres ac ON ac.audiopro_id = a.id
JOIN centres_auditifs c  ON c.id = ac.centre_id
WHERE c.plan = 'premium'
  AND a.lifecycle_stage = 'premium'
  AND NOT EXISTS (
    SELECT 1 FROM audiopro_lifecycle_events e
    WHERE e.audiopro_id = a.id
      AND e.reason = 'migration_premium_detected'
  );


-- ============================================================
-- Étape 5 : rapport RAISE NOTICE (visible dans les logs Supabase)
-- ============================================================
DO $$
DECLARE
  v_audiopros_count INTEGER;
  v_centres_linked  INTEGER;
  v_by_stage        JSONB;
  v_emails_uniques  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_audiopros_count FROM audiopro_lifecycle;
  SELECT COUNT(*) INTO v_centres_linked  FROM audiopro_centres;
  SELECT COUNT(DISTINCT LOWER(claimed_by_email))
    INTO v_emails_uniques
    FROM centres_auditifs
    WHERE claimed_by_email IS NOT NULL
      AND TRIM(claimed_by_email) != '';
  SELECT jsonb_object_agg(lifecycle_stage, count) INTO v_by_stage
  FROM (
    SELECT lifecycle_stage, COUNT(*) AS count
    FROM audiopro_lifecycle
    GROUP BY lifecycle_stage
  ) sub;

  RAISE NOTICE '=== Migration audiopro_lifecycle ===';
  RAISE NOTICE 'Emails uniques dans centres_auditifs : %', v_emails_uniques;
  RAISE NOTICE 'Audiopros créés : %', v_audiopros_count;
  RAISE NOTICE 'Liens centres : %', v_centres_linked;
  RAISE NOTICE 'Distribution par stage : %', v_by_stage;
END $$;

-- ============================================================
-- Fin migration 029
-- ============================================================
