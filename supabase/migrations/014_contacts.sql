-- ============================================================
-- Migration 014 : Table contacts pour import Waalaxy / LinkedIn / etc.
-- PRD V1.3 — Phase 6. Idempotent.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Wrapper IMMUTABLE pour unaccent (Postgres refuse unaccent direct
-- dans les index expressions, pattern Supabase standard).
CREATE OR REPLACE FUNCTION public.unaccent_immutable(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (trim(first_name || ' ' || last_name)) STORED,
  gender TEXT,

  -- Pro
  job_title TEXT,
  occupation TEXT,
  company_name TEXT,
  company_website TEXT,
  company_linkedin_url TEXT,

  -- Location
  location TEXT,
  country TEXT,

  -- Contact
  linkedin_url TEXT,
  linkedin_email TEXT,
  pro_email TEXT,
  phone_numbers TEXT,
  profile_picture_url TEXT,

  -- Waalaxy-specific
  waalaxy_state TEXT,
  waalaxy_prospect_list TEXT,
  waalaxy_message_sent BOOLEAN DEFAULT FALSE,
  waalaxy_message_replied BOOLEAN DEFAULT FALSE,
  waalaxy_last_reply_content TEXT,
  waalaxy_last_reply_date TIMESTAMPTZ,
  waalaxy_connected_at TIMESTAMPTZ,

  -- Tracking import
  source_import TEXT NOT NULL DEFAULT 'waalaxy',
  first_imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Lien prospect
  converted_to_prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,

  -- Archivage
  archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps standard
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT contacts_gender_check
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),
  CONSTRAINT contacts_waalaxy_state_check
    CHECK (waalaxy_state IS NULL OR waalaxy_state IN (
      'interested', 'replied', 'later_interested', 'not_interested', 'connected'
    )),
  CONSTRAINT contacts_source_import_check
    CHECK (source_import IN ('waalaxy', 'linkedin', 'manual', 'other'))
);

-- Dedup unique sur combo normalisé (lower + unaccent_immutable)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_dedup
  ON public.contacts (
    LOWER(public.unaccent_immutable(first_name)),
    LOWER(public.unaccent_immutable(last_name)),
    LOWER(public.unaccent_immutable(COALESCE(company_name, '')))
  );

-- Index métier
CREATE INDEX IF NOT EXISTS idx_contacts_waalaxy_state
  ON public.contacts (waalaxy_state)
  WHERE waalaxy_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_archived
  ON public.contacts (archived)
  WHERE archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_contacts_converted
  ON public.contacts (converted_to_prospect_id)
  WHERE converted_to_prospect_id IS NOT NULL;

-- FTS sur full_name pour search côté page contacts
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_search
  ON public.contacts USING GIN (to_tsvector('french', full_name));

-- Trigger updated_at (réutilise la fonction de 012)
DROP TRIGGER IF EXISTS contacts_updated_at ON public.contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS : service_role only
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.contacts IS
  'Pool de contacts issus d''imports CSV (Waalaxy, LinkedIn, etc.). Un contact peut être converti en prospect. Dedup sur (first_name, last_name, company_name) normalisés.';
