-- ============================================================
-- Migration 023 : Lien contacts ↔ auth.users pour signups espace pro
-- Date      : 2026-04-23
-- Contexte  : Tracker dans contacts les users authentifiés sur
--             /audioprothesiste-pro/ qui n'ont pas (encore) de fiche
--             revendiquée. Ces leads sont visibles dans /admin/contacts
--             et peuvent être convertis en prospect manuellement plus tard.
-- ============================================================
-- Additions :
--   1. contacts.audiopro_auth_user_id (UUID, FK auth.users, UNIQUE partiel)
--   2. source_import = 'audiopro_signup' ajouté au CHECK
--   3. Index pour lookup rapide par auth user id
--
-- Idempotent : ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- ============================================================

-- 1. Colonne audiopro_auth_user_id
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS audiopro_auth_user_id UUID NULL
  REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.contacts.audiopro_auth_user_id IS
  'Lien vers auth.users lorsque le contact s''est connecté à /audioprothesiste-pro/ sans avoir (encore) de fiche revendiquée. Permet de distinguer un lead Waalaxy passif d''un lead actif qui a déjà mis les pieds sur le site pro.';

-- 2. Index unique partiel — un auth user = un seul contact
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_audiopro_auth_user_unique
  ON public.contacts (audiopro_auth_user_id)
  WHERE audiopro_auth_user_id IS NOT NULL;

-- 3. Élargir le CHECK source_import avec 'audiopro_signup'
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_source_import_check;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_source_import_check
  CHECK (source_import = ANY (ARRAY[
    'waalaxy'::text,
    'linkedin'::text,
    'manual'::text,
    'other'::text,
    'audiopro_signup'::text
  ]));

-- ============================================================
-- Fin migration 023
-- ============================================================
