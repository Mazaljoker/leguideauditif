-- ============================================================
-- Migration 019 : colonne emails TEXT[] sur prospects
-- Date : 2026-04-23
-- Objectif : stocker les e-mails personnels du prospect (distincts
--            des e-mails centres qui vivent dans centres_auditifs).
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS emails TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_prospects_emails_gin
  ON public.prospects USING GIN (emails);

COMMENT ON COLUMN public.prospects.emails IS
  'Liste d''e-mails personnels ou de contact pour ce prospect, distincts des e-mails des centres liés (ceux-ci restent dans centres_auditifs.email et .claimed_by_email).';
