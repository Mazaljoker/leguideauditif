-- ============================================================
-- Migration 031 : Fusion molle des doublons audiopro (Phase 1.5)
-- Date         : 2026-04-24
-- Contexte     : les 47 audios de la migration 029 comportent 3 groupes
--                de doublons (1 personne physique → plusieurs adresses
--                pro). Cf. discussion 24/04 avec Franck.
-- ============================================================
-- Stratégie Option B (soft merge) :
--   - Colonne merged_into_id UUID → pointe vers l'audio canonical
--   - Les dupes ne sont PAS supprimés, juste filtrés de v_audiopro_list
--   - Réversible en mettant merged_into_id = NULL
--
-- 3 groupes fusionnés (master = premier claim chronologique) :
--   - Benjamin Astruc  : levallois (14/04) master, dammartin + douai dupes
--   - Émilie Hardier   : valenciennes (20/04) master, amandinois + douai dupes
--   - Aymeric Juen     : 9jvr (15/04) master, 9jca dupe
--
-- Bonus Émilie : lie le prospect existant (status='rdv') à son audio
-- canonical + peuple prospects.emails + prospect_centres pour les 3 centres.
-- ============================================================

-- Étape 1 : ajouter la colonne merged_into_id
ALTER TABLE audiopro_lifecycle
  ADD COLUMN IF NOT EXISTS merged_into_id UUID
    REFERENCES audiopro_lifecycle(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audiopro_lifecycle_merged_into
  ON audiopro_lifecycle(merged_into_id)
  WHERE merged_into_id IS NOT NULL;

COMMENT ON COLUMN audiopro_lifecycle.merged_into_id IS
  'Fusion molle : pointe vers l''audio canonical si cette ligne est un doublon. NULL = ligne active. Réversible en mettant NULL.';

-- Contrainte anti-auto-référence (pas de chaîne, pas de self-loop)
ALTER TABLE audiopro_lifecycle
  DROP CONSTRAINT IF EXISTS audiopro_lifecycle_merged_not_self;
ALTER TABLE audiopro_lifecycle
  ADD CONSTRAINT audiopro_lifecycle_merged_not_self
  CHECK (merged_into_id IS NULL OR merged_into_id != id);

-- ============================================================
-- Étape 2 : fusion des 3 groupes
-- ============================================================

-- ─── Groupe Benjamin Astruc ─────────────────────────────────
-- Master : levallois.meilleuraudio@gmail.com
-- Dupes  : dammartin, douai
DO $$
DECLARE
  v_master UUID;
  v_dupes UUID[];
BEGIN
  SELECT id INTO v_master
  FROM audiopro_lifecycle
  WHERE email = 'levallois.meilleuraudio@gmail.com';

  SELECT array_agg(id) INTO v_dupes
  FROM audiopro_lifecycle
  WHERE email IN ('dammartin.meilleuraudio@gmail.com', 'douai.meilleuraudio@gmail.com');

  IF v_master IS NOT NULL AND v_dupes IS NOT NULL THEN
    -- Migrer les centres des dupes vers le master (idempotent sur PK composée)
    UPDATE audiopro_centres SET audiopro_id = v_master
    WHERE audiopro_id = ANY(v_dupes);

    -- Marquer les dupes comme merged
    UPDATE audiopro_lifecycle
    SET merged_into_id = v_master
    WHERE id = ANY(v_dupes) AND merged_into_id IS NULL;

    -- Event de traçabilité sur le master
    INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, metadata)
    SELECT
      v_master,
      lifecycle_stage,
      lifecycle_stage,
      'merged_from_duplicate',
      jsonb_build_object(
        'dupe_emails', ARRAY['dammartin.meilleuraudio@gmail.com', 'douai.meilleuraudio@gmail.com'],
        'master_email', 'levallois.meilleuraudio@gmail.com'
      )
    FROM audiopro_lifecycle
    WHERE id = v_master
    AND NOT EXISTS (
      SELECT 1 FROM audiopro_lifecycle_events
      WHERE audiopro_id = v_master
        AND reason = 'merged_from_duplicate'
    );
  END IF;
END $$;

-- ─── Groupe Émilie Hardier ──────────────────────────────────
-- Master : labohardier.valenciennes@wanadoo.fr
-- Dupes  : audition.amandinois, labohardier.douai
DO $$
DECLARE
  v_master UUID;
  v_dupes UUID[];
  v_prospect UUID;
  v_centre_ids UUID[];
BEGIN
  SELECT id INTO v_master
  FROM audiopro_lifecycle
  WHERE email = 'labohardier.valenciennes@wanadoo.fr';

  SELECT array_agg(id) INTO v_dupes
  FROM audiopro_lifecycle
  WHERE email IN ('audition.amandinois@wanadoo.fr', 'labohardier.douai@wanadoo.fr');

  -- Prospect existant Émilie Hardier (cf. check préalable du 24/04)
  SELECT id INTO v_prospect
  FROM prospects
  WHERE name ILIKE 'Émilie Hardier' OR name ILIKE 'Emilie Hardier'
  LIMIT 1;

  IF v_master IS NOT NULL AND v_dupes IS NOT NULL THEN
    UPDATE audiopro_centres SET audiopro_id = v_master
    WHERE audiopro_id = ANY(v_dupes);

    UPDATE audiopro_lifecycle
    SET merged_into_id = v_master
    WHERE id = ANY(v_dupes) AND merged_into_id IS NULL;

    INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, metadata)
    SELECT
      v_master,
      lifecycle_stage,
      lifecycle_stage,
      'merged_from_duplicate',
      jsonb_build_object(
        'dupe_emails', ARRAY['audition.amandinois@wanadoo.fr', 'labohardier.douai@wanadoo.fr'],
        'master_email', 'labohardier.valenciennes@wanadoo.fr'
      )
    FROM audiopro_lifecycle
    WHERE id = v_master
    AND NOT EXISTS (
      SELECT 1 FROM audiopro_lifecycle_events
      WHERE audiopro_id = v_master AND reason = 'merged_from_duplicate'
    );

    -- Bonus : lier le prospect CRM Émilie Hardier au master
    IF v_prospect IS NOT NULL THEN
      -- Peupler prospect.emails avec les 3 emails connus (merge idempotent via array_agg DISTINCT)
      UPDATE prospects
      SET emails = (
        SELECT array_agg(DISTINCT e)
        FROM unnest(COALESCE(emails, ARRAY[]::text[])
          || ARRAY['labohardier.valenciennes@wanadoo.fr','audition.amandinois@wanadoo.fr','labohardier.douai@wanadoo.fr']
        ) AS e
      )
      WHERE id = v_prospect;

      -- Lier audio master → prospect (non destructif : WHERE prospect_id IS NULL)
      UPDATE audiopro_lifecycle
      SET prospect_id = v_prospect
      WHERE id = v_master AND prospect_id IS NULL;

      -- Lier les 3 centres du master au prospect (idempotent sur PK composée)
      SELECT array_agg(centre_id) INTO v_centre_ids
      FROM audiopro_centres
      WHERE audiopro_id = v_master;

      IF v_centre_ids IS NOT NULL THEN
        INSERT INTO prospect_centres (prospect_id, centre_id, is_primary, linked_via)
        SELECT
          v_prospect,
          unnest(v_centre_ids),
          FALSE,  -- is_primary à FALSE pour éviter conflit avec l'index partiel unique
          'auto_claim'
        ON CONFLICT (prospect_id, centre_id) DO NOTHING;

        -- Promouvoir is_primary=TRUE sur le 1er si aucun primary n'existe
        UPDATE prospect_centres
        SET is_primary = TRUE
        WHERE prospect_id = v_prospect
          AND centre_id = v_centre_ids[1]
          AND NOT EXISTS (
            SELECT 1 FROM prospect_centres
            WHERE prospect_id = v_prospect AND is_primary = TRUE
          );

        -- Mettre à jour prospects.centres_count (CHECK >= 1 respecté)
        UPDATE prospects
        SET centres_count = GREATEST(1, array_length(v_centre_ids, 1))
        WHERE id = v_prospect;
      END IF;
    END IF;
  END IF;
END $$;

-- ─── Groupe Aymeric Juen ────────────────────────────────────
-- Master : 9jvr@afflelou.net (claim le plus ancien ET stage le plus avancé)
-- Dupes  : 9jca
DO $$
DECLARE
  v_master UUID;
  v_dupes UUID[];
BEGIN
  SELECT id INTO v_master
  FROM audiopro_lifecycle
  WHERE email = '9jvr@afflelou.net';

  SELECT array_agg(id) INTO v_dupes
  FROM audiopro_lifecycle
  WHERE email IN ('9jca@afflelou.net');

  IF v_master IS NOT NULL AND v_dupes IS NOT NULL THEN
    UPDATE audiopro_centres SET audiopro_id = v_master
    WHERE audiopro_id = ANY(v_dupes);

    UPDATE audiopro_lifecycle
    SET merged_into_id = v_master
    WHERE id = ANY(v_dupes) AND merged_into_id IS NULL;

    INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, metadata)
    SELECT
      v_master,
      lifecycle_stage,
      lifecycle_stage,
      'merged_from_duplicate',
      jsonb_build_object(
        'dupe_emails', ARRAY['9jca@afflelou.net'],
        'master_email', '9jvr@afflelou.net'
      )
    FROM audiopro_lifecycle
    WHERE id = v_master
    AND NOT EXISTS (
      SELECT 1 FROM audiopro_lifecycle_events
      WHERE audiopro_id = v_master AND reason = 'merged_from_duplicate'
    );
  END IF;
END $$;

-- ============================================================
-- Étape 3 : recréer v_audiopro_list avec filtre merged_into_id IS NULL
-- ============================================================
CREATE OR REPLACE VIEW v_audiopro_list AS
SELECT
  a.id                         AS audiopro_id,
  a.email,
  a.prenom,
  a.nom,
  a.lifecycle_stage,
  a.stage_changed_at,
  a.first_claim_at,
  a.prospect_id,
  a.email_unsubscribed_at,
  a.hard_bounced_at,

  (
    SELECT COUNT(*)
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = a.id
  ) AS nb_centres,

  (
    SELECT COALESCE(ROUND(AVG(public.completeness_pct(ac.centre_id))), 0)::INTEGER
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = a.id
  ) AS completeness_avg,

  (
    SELECT string_agg(count || ' ' || claim_status, ' / ' ORDER BY claim_status)
    FROM (
      SELECT c.claim_status, COUNT(*) AS count
      FROM audiopro_centres ac
      JOIN centres_auditifs c ON c.id = ac.centre_id
      WHERE ac.audiopro_id = a.id
      GROUP BY c.claim_status
    ) grouped
  ) AS claim_status_summary,

  (
    SELECT ee.template_key FROM email_events ee
    WHERE ee.audiopro_id = a.id ORDER BY ee.sent_at DESC LIMIT 1
  ) AS last_email_template,

  (
    SELECT ee.sent_at FROM email_events ee
    WHERE ee.audiopro_id = a.id ORDER BY ee.sent_at DESC LIMIT 1
  ) AS last_email_sent_at,

  (
    SELECT ee.clicked_at FROM email_events ee
    WHERE ee.audiopro_id = a.id ORDER BY ee.sent_at DESC LIMIT 1
  ) AS last_email_clicked_at,

  (
    SELECT COUNT(*) FROM email_events ee
    WHERE ee.audiopro_id = a.id
      AND ee.sent_at >= NOW() - INTERVAL '30 days'
  ) AS emails_sent_30d,

  p.status AS prospect_status

FROM audiopro_lifecycle a
LEFT JOIN prospects p ON p.id = a.prospect_id
WHERE a.merged_into_id IS NULL;  -- Masque les doublons fusionnés

COMMENT ON VIEW v_audiopro_list IS
  'Vue agrégée pour /admin/claims. Exclut les doublons fusionnés (merged_into_id IS NULL).';

-- ============================================================
-- Fin migration 031
-- ============================================================
