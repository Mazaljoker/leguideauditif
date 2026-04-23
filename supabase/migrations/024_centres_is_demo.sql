-- ============================================================
-- Migration 024 : Flag is_demo sur centres_auditifs
-- Date      : 2026-04-23
-- Contexte  : Permettre la création de fiches de démonstration
--             (visibles uniquement dans l'espace pro du propriétaire,
--             exclues de toutes les surfaces publiques indexables).
-- ============================================================
-- Cas d'usage :
--   - Démos commerciales (montrer un dashboard rempli à un prospect)
--   - Screenshots marketing
--   - Tests E2E Playwright sans polluer la carte publique
--
-- Exclusions côté code :
--   - Carte /trouver-audioprothesiste/
--   - Pages ville /audioprothesiste/[ville]/
--   - Pages département /audioprothesiste/departement/[dep]/
--   - Sitemap centres + sitemap pages-locales
--   - RPC nearby_claimed_centres (concurrents sur fiche RPPS)
--   - API claim / revendiquer (refus explicite)
--
-- Exclusions NON faites (intentionnellement) :
--   - /centre/[slug]/ reste accessible directement via URL (utile pour
--     partager un lien démo), mais la page porte meta noindex si is_demo.
--   - /audioprothesiste-pro/ voit toutes les fiches de l'user, y compris demos.
-- ============================================================

-- 1. Colonne is_demo (NOT NULL DEFAULT FALSE → zéro impact sur existant)
ALTER TABLE public.centres_auditifs
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.centres_auditifs.is_demo IS
  'Flag fiche de démonstration. Exclue des surfaces publiques (carte, pages ville/département, sitemap, concurrents) mais visible dans /audioprothesiste-pro/ pour le propriétaire.';

-- 2. Index partiel pour accélérer les queries publiques
--    (filtre "WHERE is_demo = false" très fréquent, seules les rares demos sont à exclure)
CREATE INDEX IF NOT EXISTS idx_centres_is_demo
  ON public.centres_auditifs (is_demo)
  WHERE is_demo = TRUE;

-- 3. Update RPC nearby_claimed_centres pour exclure les démos
CREATE OR REPLACE FUNCTION public.nearby_claimed_centres(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_exclude_id UUID,
  p_radius_km DOUBLE PRECISION DEFAULT 5,
  p_limit INT DEFAULT 3
) RETURNS SETOF centres_auditifs AS $$
  SELECT *
  FROM centres_auditifs
  WHERE id != p_exclude_id
    AND plan IN ('claimed', 'premium')
    AND is_demo = FALSE
    AND lat IS NOT NULL AND lng IS NOT NULL
    AND lat BETWEEN p_lat - (p_radius_km / 111.0) AND p_lat + (p_radius_km / 111.0)
    AND lng BETWEEN p_lng - (p_radius_km / (111.0 * COS(RADIANS(p_lat)))) AND p_lng + (p_radius_km / (111.0 * COS(RADIANS(p_lat))))
  ORDER BY ((lat - p_lat)^2 + (lng - p_lng)^2) ASC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Fin migration 024
-- ============================================================
