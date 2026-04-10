-- ============================================================
-- Migration 005 : Page views, champs audio, RPC nearby + stats
-- ============================================================

-- 1. Colonnes audio (nom/prenom de l'audioprothesiste RPPS)
ALTER TABLE centres_auditifs ADD COLUMN audio_nom TEXT;
ALTER TABLE centres_auditifs ADD COLUMN audio_prenom TEXT;

-- 2. Table page views (append-only, pour compteurs "vues ce mois")
CREATE TABLE centre_page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID NOT NULL REFERENCES centres_auditifs(id),
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cpv_centre ON centre_page_views(centre_id);
CREATE INDEX idx_cpv_date ON centre_page_views(viewed_at DESC);

ALTER TABLE centre_page_views ENABLE ROW LEVEL SECURITY;

-- Insert public (anon peut enregistrer une vue)
CREATE POLICY "Anon insert views"
  ON centre_page_views
  FOR INSERT
  WITH CHECK (true);

-- Select public (pour les RPCs)
CREATE POLICY "Public read views"
  ON centre_page_views
  FOR SELECT
  USING (true);

-- 3. RPC : centres revendiques a proximite (bounding box, pas de PostGIS)
CREATE OR REPLACE FUNCTION nearby_claimed_centres(
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
    AND lat IS NOT NULL AND lng IS NOT NULL
    AND lat BETWEEN p_lat - (p_radius_km / 111.0) AND p_lat + (p_radius_km / 111.0)
    AND lng BETWEEN p_lng - (p_radius_km / (111.0 * COS(RADIANS(p_lat)))) AND p_lng + (p_radius_km / (111.0 * COS(RADIANS(p_lat))))
  ORDER BY ((lat - p_lat)^2 + (lng - p_lng)^2) ASC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- 4. RPC : stats de vues pour un centre
CREATE OR REPLACE FUNCTION centre_view_stats(p_centre_id UUID)
RETURNS TABLE(total_views BIGINT, views_30d BIGINT) AS $$
  SELECT
    COUNT(*) AS total_views,
    COUNT(*) FILTER (WHERE viewed_at > NOW() - INTERVAL '30 days') AS views_30d
  FROM centre_page_views
  WHERE centre_id = p_centre_id;
$$ LANGUAGE sql STABLE;
