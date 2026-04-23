-- ============================================================
-- Migration 022 : Statut lu/non-lu sur leads + RPC get_user_leads
-- Date      : 2026-04-23
-- Contexte  : Espace pro /audioprothesiste-pro/leads/
-- ============================================================
-- Objectifs :
--   1. Ajouter leads.read_at (TIMESTAMPTZ NULL) — null = non lu
--   2. Indexer (source, created_at DESC) pour les queries pro
--   3. RPC get_user_leads(email, limit, offset) :
--      - join implicite via source = 'centre/' || slug
--      - filtre claimed_by_email + claim_status = 'approved'
--      - retour enrichi du nom/slug du centre
--
-- Idempotent : ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION. Rejouable sans erreur.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Colonne read_at
-- ------------------------------------------------------------
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.leads.read_at IS
  'Timestamp de marquage lu par le pro dans son espace. NULL = non lu. Écrit par POST /api/audiopro/leads-mark-read.';

-- ------------------------------------------------------------
-- 2. Index sur (source, created_at DESC)
--    Utilisé pour lister les leads d''un centre par date décroissante.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_source_created
  ON public.leads (source, created_at DESC);

-- Index partiel non-lus : accélère le compteur "demandes non lues"
-- (devient utile quand la table grossit — aujourd'hui 1 row, mais prod).
CREATE INDEX IF NOT EXISTS idx_leads_unread
  ON public.leads (source, created_at DESC)
  WHERE read_at IS NULL;

-- ------------------------------------------------------------
-- 3. RPC get_user_leads
--    Lit les leads des centres claimed_by_email=p_email,
--    retourne format enrichi (centre_slug + centre_nom) avec
--    pagination. Tri DESC sur created_at.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_leads(
  p_email TEXT,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_only_unread BOOLEAN DEFAULT FALSE,
  p_centre_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  phone TEXT,
  zip_code TEXT,
  hearing_loss_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  centre_slug TEXT,
  centre_nom TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id,
    l.first_name,
    l.phone,
    l.zip_code,
    l.hearing_loss_type,
    l.status,
    l.created_at,
    l.read_at,
    c.slug AS centre_slug,
    c.nom AS centre_nom
  FROM leads l
  JOIN centres_auditifs c ON l.source = 'centre/' || c.slug
  WHERE LOWER(TRIM(c.claimed_by_email)) = LOWER(TRIM(p_email))
    AND c.claim_status = 'approved'
    AND (p_only_unread = FALSE OR l.read_at IS NULL)
    AND (p_centre_slug IS NULL OR c.slug = p_centre_slug)
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100))
  OFFSET GREATEST(0, p_offset);
$$;

COMMENT ON FUNCTION public.get_user_leads(TEXT, INT, INT, BOOLEAN, TEXT) IS
  'Liste paginée des demandes de bilan reçues par les centres claimed_by_email=p_email. Filtrable par centre_slug et par non lu seulement. SECURITY DEFINER : bypass RLS (sécurité métier via match email).';

GRANT EXECUTE ON FUNCTION public.get_user_leads(TEXT, INT, INT, BOOLEAN, TEXT)
  TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 4. RPC count_user_leads (compteurs pour header + stats)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_user_leads(
  p_email TEXT,
  p_centre_slug TEXT DEFAULT NULL
)
RETURNS TABLE (
  total BIGINT,
  unread BIGINT,
  last_7d BIGINT,
  last_30d BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE l.read_at IS NULL)::BIGINT AS unread,
    COUNT(*) FILTER (WHERE l.created_at >= NOW() - INTERVAL '7 days')::BIGINT AS last_7d,
    COUNT(*) FILTER (WHERE l.created_at >= NOW() - INTERVAL '30 days')::BIGINT AS last_30d
  FROM leads l
  JOIN centres_auditifs c ON l.source = 'centre/' || c.slug
  WHERE LOWER(TRIM(c.claimed_by_email)) = LOWER(TRIM(p_email))
    AND c.claim_status = 'approved'
    AND (p_centre_slug IS NULL OR c.slug = p_centre_slug);
$$;

COMMENT ON FUNCTION public.count_user_leads(TEXT, TEXT) IS
  'Compteurs leads (total, non lus, 7j, 30j) pour un pro. Utilisé par le dashboard et la page leads.';

GRANT EXECUTE ON FUNCTION public.count_user_leads(TEXT, TEXT)
  TO anon, authenticated, service_role;

-- ============================================================
-- Fin migration 022
-- ============================================================
