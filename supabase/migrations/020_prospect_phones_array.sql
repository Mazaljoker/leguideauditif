-- ============================================================
-- Migration 020 : colonne phones TEXT[] sur prospects
-- Date : 2026-04-23
-- Objectif : stocker les numéros de téléphone personnels du prospect
--            (distincts des tel des centres qui vivent dans centres_auditifs).
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS phones TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_prospects_phones_gin
  ON public.prospects USING GIN (phones);

COMMENT ON COLUMN public.prospects.phones IS
  'Liste de téléphones personnels pour ce prospect, distincts des tel des centres liés (ceux-ci restent dans centres_auditifs.tel).';
