-- ============================================================
-- Migration 017 : flag is_apporteur sur prospects
-- Date : 2026-04-22
-- Objectif : distinguer les prospects "clients potentiels" (audioprothésistes
--            avec centre, qui peuvent signer LGA Sérénité) des
--            "contacts commerciaux / apporteurs d'affaires" (personnes
--            qui ramènent des leads mais ne sont pas eux-mêmes clients).
-- ============================================================
-- Orthogonal à status et is_fondateur (un apporteur peut être Fondateur,
-- être en proposition, etc.). Le filtre UI permet de séparer les 2
-- populations dans le kanban.
-- ============================================================

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS is_apporteur BOOLEAN NOT NULL DEFAULT FALSE;

-- Index partiel : seuls les apporteurs sont indexés (faible cardinalité)
CREATE INDEX IF NOT EXISTS idx_prospects_is_apporteur
  ON public.prospects (is_apporteur)
  WHERE is_apporteur = TRUE;

COMMENT ON COLUMN public.prospects.is_apporteur IS
  'Flag contact commercial / apporteur d''affaires. Indépendant du statut et de is_fondateur. Permet de filtrer le pipeline entre audioprothésistes prospects (clients potentiels) et apporteurs (qui ramènent des leads sans être clients eux-mêmes).';
