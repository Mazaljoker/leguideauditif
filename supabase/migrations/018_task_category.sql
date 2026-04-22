-- ============================================================
-- Migration 018 : colonne category sur tasks
-- Date : 2026-04-22
-- Objectif : catégoriser chaque tâche par nature d'action commerciale.
-- ============================================================
-- Valeurs :
--   call   → Appel (planifier/passer un appel téléphonique)
--   email  → E-mail (relance, envoi courriel)
--   inmail → InMail LinkedIn (prospection/réponse)
--   todo   → À faire générique (défaut, action admin/opérationnelle)
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'todo';

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_category_check;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_category_check
  CHECK (category IN ('call', 'email', 'inmail', 'todo'));

CREATE INDEX IF NOT EXISTS idx_tasks_category
  ON public.tasks (category);

COMMENT ON COLUMN public.tasks.category IS
  'Catégorie d''action : call (appel), email (relance courriel), inmail (LinkedIn), todo (défaut générique).';
