-- ============================================================
-- Migration 027 : Fonctions PL/pgSQL pour le lifecycle audio
-- Date         : 2026-04-24
-- Specs data   : docs/phase1-email-pipeline/specs-phase1-data.md v1.0 §2
-- ============================================================
-- Crée 3 fonctions :
--   - completeness_pct(centre_id)        → % de complétude d'une fiche (0..100)
--   - audiopro_missing_fields(audiopro)  → liste des champs manquants par centre
--   - recompute_audiopro_lifecycle()     → transitions batch (cron quotidien)
--
-- Noms de colonnes alignés avec le schéma réel de centres_auditifs
-- (vérifié en étape 0 : tel, site_web, a_propos, photo_url, email,
-- specialites TEXT[], marques TEXT[]). Chaque champ pèse 1/7 = ~14%.
-- ============================================================

-- ============================================================
-- completeness_pct(centre_id uuid) → integer
-- ============================================================
-- Retourne un entier 0..100 selon 7 champs pondérés égaux.
-- STABLE : ne modifie pas la base, résultat déterministe par transaction.
-- ============================================================
CREATE OR REPLACE FUNCTION completeness_pct(p_centre_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_count  INTEGER := 0;
  v_centre centres_auditifs%ROWTYPE;
BEGIN
  SELECT * INTO v_centre FROM centres_auditifs WHERE id = p_centre_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF v_centre.tel         IS NOT NULL AND v_centre.tel         != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.site_web    IS NOT NULL AND v_centre.site_web    != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.a_propos    IS NOT NULL AND v_centre.a_propos    != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.photo_url   IS NOT NULL AND v_centre.photo_url   != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.email       IS NOT NULL AND v_centre.email       != '' THEN v_count := v_count + 1; END IF;
  IF v_centre.specialites IS NOT NULL AND COALESCE(array_length(v_centre.specialites, 1), 0) > 0 THEN v_count := v_count + 1; END IF;
  IF v_centre.marques     IS NOT NULL AND COALESCE(array_length(v_centre.marques, 1), 0)     > 0 THEN v_count := v_count + 1; END IF;

  RETURN ROUND(v_count * 100.0 / 7);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION completeness_pct(UUID) IS
  'Complétude d''une fiche centre sur 7 champs pondérés égaux (tel, site_web, a_propos, photo_url, email, specialites, marques). Retour : entier 0..100.';


-- ============================================================
-- audiopro_missing_fields(audiopro_id uuid) → TABLE
-- ============================================================
-- Renvoie, pour chaque centre lié à l'audio, la liste ordonnée des
-- champs manquants. Centre le moins complet en premier (cible de
-- l'ancrage magic link dans le template fiche_incomplete_relance).
-- ============================================================
CREATE OR REPLACE FUNCTION audiopro_missing_fields(p_audiopro_id UUID)
RETURNS TABLE (
  centre_id        UUID,
  centre_slug      TEXT,
  centre_nom       TEXT,
  completeness_pct INTEGER,
  missing_fields   TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.slug,
    c.nom,
    public.completeness_pct(c.id) AS completeness_pct,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.tel         IS NULL OR c.tel         = '' THEN 'tel'         END,
      CASE WHEN c.site_web    IS NULL OR c.site_web    = '' THEN 'site_web'    END,
      CASE WHEN c.a_propos    IS NULL OR c.a_propos    = '' THEN 'a_propos'    END,
      CASE WHEN c.photo_url   IS NULL OR c.photo_url   = '' THEN 'photo_url'   END,
      CASE WHEN c.email       IS NULL OR c.email       = '' THEN 'email'       END,
      CASE WHEN c.specialites IS NULL OR COALESCE(array_length(c.specialites, 1), 0) = 0 THEN 'specialites' END,
      CASE WHEN c.marques     IS NULL OR COALESCE(array_length(c.marques, 1), 0)     = 0 THEN 'marques'     END
    ], NULL) AS missing_fields
  FROM audiopro_centres ac
  JOIN centres_auditifs c ON c.id = ac.centre_id
  WHERE ac.audiopro_id = p_audiopro_id
  ORDER BY public.completeness_pct(c.id) ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION audiopro_missing_fields(UUID) IS
  'Liste des champs manquants par centre pour un audio. Ordre : centre le moins complet en premier (cible magic link).';


-- ============================================================
-- recompute_audiopro_lifecycle() → void
-- ============================================================
-- Appelée par le cron quotidien avant le drip (Phase 2). Recalcule :
--   - * → premium         (si un centre lié est plan='premium')
--   - approuve → active   (si ≥ 1 centre >= 60% OU last_login_at set)
--
-- Les transitions event-driven (revendique→approuve, active→engage,
-- *→churned) sont dans les endpoints concernés, pas ici.
-- ============================================================
CREATE OR REPLACE FUNCTION recompute_audiopro_lifecycle() RETURNS VOID AS $$
DECLARE
  v_audiopro         RECORD;
  v_max_completeness INTEGER;
BEGIN
  -- Transition * → premium (si au moins un centre lié est premium)
  FOR v_audiopro IN
    SELECT a.id, a.lifecycle_stage
    FROM audiopro_lifecycle a
    WHERE a.lifecycle_stage NOT IN ('premium', 'churned')
      AND EXISTS (
        SELECT 1 FROM audiopro_centres ac
        JOIN centres_auditifs c ON c.id = ac.centre_id
        WHERE ac.audiopro_id = a.id
          AND c.plan = 'premium'
      )
  LOOP
    UPDATE audiopro_lifecycle
    SET lifecycle_stage = 'premium',
        stage_changed_at = NOW()
    WHERE id = v_audiopro.id;

    INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason)
    VALUES (v_audiopro.id, v_audiopro.lifecycle_stage, 'premium', 'stripe_paid_batch');
  END LOOP;

  -- Transition approuve → active (si ≥ 1 centre >= 60% OU last_login_at set)
  FOR v_audiopro IN
    SELECT a.id, a.last_login_at
    FROM audiopro_lifecycle a
    WHERE a.lifecycle_stage = 'approuve'
  LOOP
    SELECT COALESCE(MAX(public.completeness_pct(ac.centre_id)), 0)
    INTO v_max_completeness
    FROM audiopro_centres ac
    WHERE ac.audiopro_id = v_audiopro.id;

    IF v_max_completeness >= 60 OR v_audiopro.last_login_at IS NOT NULL THEN
      UPDATE audiopro_lifecycle
      SET lifecycle_stage = 'active',
          stage_changed_at = NOW()
      WHERE id = v_audiopro.id;

      INSERT INTO audiopro_lifecycle_events (audiopro_id, from_stage, to_stage, reason, metadata)
      VALUES (
        v_audiopro.id,
        'approuve',
        'active',
        CASE
          WHEN v_audiopro.last_login_at IS NOT NULL THEN 'first_login_detected'
          ELSE 'completeness_threshold_reached'
        END,
        jsonb_build_object('max_completeness_pct', v_max_completeness)
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recompute_audiopro_lifecycle() IS
  'Recalcule les transitions batch (approuve→active et *→premium) pour le cron quotidien. Appelée avant le drip en Phase 2.';

-- ============================================================
-- Fin migration 027
-- ============================================================
