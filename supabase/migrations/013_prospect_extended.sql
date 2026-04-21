-- ============================================================
-- Migration 013 : Vue étendue prospect
--   - Pivot prospect_centres (1 prospect ↔ N centres_auditifs)
--   - Transcripts (2 nouveaux kinds d'interaction)
--   - Full-text search français (tsvector + index GIN + RPC)
-- ============================================================
-- PRD : V1.2 — Phase 5.0
-- Idempotent : rejouable sans erreur.
-- ============================================================

-- --- Extensions nécessaires ---
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- 1. Table pivot prospect_centres
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prospect_centres (
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES public.centres_auditifs(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  linked_via TEXT NOT NULL DEFAULT 'manual',
  PRIMARY KEY (prospect_id, centre_id),
  CONSTRAINT prospect_centres_linked_via_check
    CHECK (linked_via IN ('manual', 'auto_claim'))
);

CREATE INDEX IF NOT EXISTS idx_prospect_centres_prospect_id
  ON public.prospect_centres (prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_centres_centre_id
  ON public.prospect_centres (centre_id);

-- Un seul is_primary=TRUE par prospect (index partiel unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_centres_primary_unique
  ON public.prospect_centres (prospect_id)
  WHERE is_primary = TRUE;

ALTER TABLE public.prospect_centres ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.prospect_centres IS
  'Pivot N:M entre prospects et centres_auditifs. is_primary = centre affiché par défaut dans la vue Liste.';

-- ============================================================
-- 2. Extension enum interaction_kind : transcript_meet, transcript_call
-- ============================================================
ALTER TABLE public.prospect_interactions
  DROP CONSTRAINT IF EXISTS prospect_interactions_kind_check;

ALTER TABLE public.prospect_interactions
  ADD CONSTRAINT prospect_interactions_kind_check
  CHECK (kind IN (
    'dm', 'call', 'email', 'note', 'meeting', 'status_change',
    'transcript_meet', 'transcript_call'
  ));

-- ============================================================
-- 3. Full-text search : colonne générée + index GIN
-- ============================================================
ALTER TABLE public.prospect_interactions
  ADD COLUMN IF NOT EXISTS content_search TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('french', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_prospect_interactions_content_search
  ON public.prospect_interactions USING GIN (content_search);

-- ============================================================
-- 4. RPC search_prospect_interactions
-- Query vide = tri chronologique DESC. Query non vide = tri par
-- pertinence DESC (ts_rank).
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_prospect_interactions(
  p_prospect_id UUID,
  p_query TEXT
)
RETURNS TABLE (
  id UUID,
  prospect_id UUID,
  kind TEXT,
  content TEXT,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    i.id,
    i.prospect_id,
    i.kind,
    i.content,
    i.occurred_at,
    i.created_at,
    CASE
      WHEN p_query IS NULL OR p_query = ''
        THEN 0::real
      ELSE ts_rank(i.content_search, websearch_to_tsquery('french', p_query))
    END AS rank
  FROM public.prospect_interactions i
  WHERE i.prospect_id = p_prospect_id
    AND (
      p_query IS NULL
      OR p_query = ''
      OR i.content_search @@ websearch_to_tsquery('french', p_query)
    )
  ORDER BY
    CASE WHEN p_query IS NULL OR p_query = '' THEN i.occurred_at END DESC NULLS LAST,
    CASE WHEN p_query IS NOT NULL AND p_query <> ''
      THEN ts_rank(i.content_search, websearch_to_tsquery('french', p_query))
    END DESC NULLS LAST,
    i.occurred_at DESC
  LIMIT 200;
$$;

COMMENT ON FUNCTION public.search_prospect_interactions IS
  'Recherche full-text française dans les interactions d''un prospect. Query vide = tri chronologique DESC. Query non vide = tri par pertinence DESC, fallback chronologique.';

-- ============================================================
-- Fin migration 013
-- ============================================================
