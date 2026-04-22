-- ============================================================
-- Migration 016 : Trigger auto-création prospect + lien
--                 à chaque claim approuvé
-- Date : 2026-04-22
-- Objectif : éviter que le pivot prospect_centres se redésynchronise
--            (65 centres orphelins constatés sur l'audit du 22/04).
-- ============================================================
-- Comportement :
--   Quand centres_auditifs.claim_status passe à 'approved' ET
--   qu'aucun lien prospect_centres n'existe déjà pour ce centre :
--     - Si un prospect existe pour cet email (via un autre centre lié)
--       → crée seulement le lien (is_primary = FALSE, linked_via = 'auto_claim')
--     - Sinon → crée le prospect (source='entrant', status='prospect') +
--       le lien (is_primary = TRUE)
--
-- Idempotent : rejouable sans erreur. SECURITY DEFINER pour bypass RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_link_claimed_centre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_prospect_id UUID;
  new_prospect_id UUID;
  email_norm TEXT;
  default_name TEXT;
BEGIN
  -- Garde-fous (la clause WHEN du trigger couvre déjà le statut,
  -- mais on reste défensif).
  IF NEW.claim_status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  IF NEW.claimed_by_email IS NULL OR TRIM(NEW.claimed_by_email) = '' THEN
    RETURN NEW;
  END IF;

  -- Idempotence : si un lien existe déjà pour ce centre, rien à faire.
  IF EXISTS (SELECT 1 FROM prospect_centres WHERE centre_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  email_norm := LOWER(TRIM(NEW.claimed_by_email));

  -- Chercher un prospect existant pour ce même email,
  -- via un autre centre déjà lié.
  SELECT p.id INTO existing_prospect_id
  FROM prospects p
  JOIN prospect_centres pc ON pc.prospect_id = p.id
  JOIN centres_auditifs c ON c.id = pc.centre_id
  WHERE LOWER(TRIM(COALESCE(c.claimed_by_email, ''))) = email_norm
  LIMIT 1;

  IF existing_prospect_id IS NOT NULL THEN
    -- Le prospect existe déjà : ajout lien secondaire uniquement.
    INSERT INTO prospect_centres (prospect_id, centre_id, is_primary, linked_via, linked_at)
    VALUES (existing_prospect_id, NEW.id, FALSE, 'auto_claim', NOW());
  ELSE
    -- Nouveau prospect + lien primary.
    default_name := COALESCE(
      NULLIF(TRIM(NEW.claimed_by_name), ''),
      'Prospect — ' || NEW.claimed_by_email
    );

    INSERT INTO prospects (
      name, company, source, status, cp, departement, centres_count, notes
    )
    VALUES (
      default_name,
      NULLIF(TRIM(NEW.nom), ''),
      'entrant',
      'prospect',
      NEW.cp,
      NULLIF(SUBSTRING(COALESCE(NEW.cp, '') FROM 1 FOR 2), ''),
      1,
      'Auto-créé par trigger auto_link_claimed_centre le ' ||
      to_char(NOW(), 'YYYY-MM-DD HH24:MI') ||
      '. Email: ' || NEW.claimed_by_email ||
      '. Centre initial: ' || NEW.slug || '.'
    )
    RETURNING id INTO new_prospect_id;

    INSERT INTO prospect_centres (prospect_id, centre_id, is_primary, linked_via, linked_at)
    VALUES (new_prospect_id, NEW.id, TRUE, 'auto_claim', NOW());
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_link_claimed_centre() IS
  'Auto-crée un prospect (source=entrant) et/ou un lien prospect_centres à chaque transition claim_status → approved. SECURITY DEFINER pour bypass RLS.';

-- Nettoyage ancien trigger si rejeu de la migration
DROP TRIGGER IF EXISTS trg_auto_link_claimed_centre ON public.centres_auditifs;

CREATE TRIGGER trg_auto_link_claimed_centre
AFTER UPDATE OF claim_status ON public.centres_auditifs
FOR EACH ROW
WHEN (NEW.claim_status = 'approved' AND OLD.claim_status IS DISTINCT FROM 'approved')
EXECUTE FUNCTION public.auto_link_claimed_centre();

COMMENT ON TRIGGER trg_auto_link_claimed_centre ON public.centres_auditifs IS
  'Déclenche la synchronisation prospect ↔ centre à chaque claim approuvé. Migration 016 (2026-04-22).';
