-- ============================================================
-- Migration 021 : RPC get_user_centres
-- Date      : 2026-04-23
-- Contexte  : Espace pro /audioprothesiste-pro/
-- ============================================================
-- Retourne la liste des centres approved revendiqués par un
-- email. Supporte le multi-centres nativement (1 email ↔ N
-- centres_auditifs.claimed_by_email). Le flag is_primary est
-- dérivé de la table pivot prospect_centres.is_primary (voir
-- migrations 013 + 016). Si aucun lien prospect_centres
-- n'existe (cas edge historique), le centre est considéré
-- primary par défaut.
-- ============================================================
-- Idempotent : CREATE OR REPLACE. Rejouable sans erreur.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_centres(p_email TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  nom TEXT,
  ville TEXT,
  cp TEXT,
  plan TEXT,
  is_primary BOOLEAN,
  is_premium BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.slug,
    c.nom,
    c.ville,
    c.cp,
    c.plan::TEXT,
    -- TRUE si au moins un lien pivot is_primary=TRUE existe,
    -- OU si aucun lien pivot du tout (cas legacy avant trigger 016).
    COALESCE(BOOL_OR(pc.is_primary), TRUE) AS is_primary,
    (c.plan = 'premium') AS is_premium
  FROM centres_auditifs c
  LEFT JOIN prospect_centres pc ON pc.centre_id = c.id
  WHERE LOWER(TRIM(c.claimed_by_email)) = LOWER(TRIM(p_email))
    AND c.claim_status = 'approved'
  GROUP BY c.id, c.slug, c.nom, c.ville, c.cp, c.plan
  ORDER BY is_primary DESC, c.nom;
$$;

COMMENT ON FUNCTION public.get_user_centres(TEXT) IS
  'Liste des centres approved revendiqués par un email. Source de vérité pour /audioprothesiste-pro/. SECURITY DEFINER : bypass RLS (les tables centres_auditifs et prospect_centres sont en service_role only).';

-- Autoriser l'appel RPC depuis le client anon authentifié (le check
-- de sécurité réel se fait sur la correspondance email ↔ claimed_by_email
-- côté SQL, pas côté RLS).
GRANT EXECUTE ON FUNCTION public.get_user_centres(TEXT) TO anon, authenticated, service_role;

-- ============================================================
-- Fin migration 021
-- ============================================================
