-- ============================================================
-- Migration 015 : Task manager unifié — Phase 8
-- Tâches libres OU attachées (prospect/contact/centre) + récurrence simple
-- Idempotent
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Table tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contenu
  title TEXT NOT NULL,
  description TEXT,

  -- Rattachement polymorphique (NULL = tâche libre)
  owner_type TEXT CHECK (owner_type IN ('prospect', 'contact', 'centre') OR owner_type IS NULL),
  owner_id UUID,

  -- Échéance
  due_at TIMESTAMPTZ,

  -- Statut
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'skipped')),
  done_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,

  -- Récurrence simple
  recurrence_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (recurrence_kind IN ('none', 'daily', 'weekly', 'monthly')),
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cohérence : owner_type IS NULL <=> owner_id IS NULL
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_owner_consistency;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_owner_consistency CHECK (
    (owner_type IS NULL AND owner_id IS NULL)
    OR (owner_type IS NOT NULL AND owner_id IS NOT NULL)
  );

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_tasks_owner
  ON public.tasks(owner_type, owner_id)
  WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_due
  ON public.tasks(status, due_at)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_tasks_due_at
  ON public.tasks(due_at)
  WHERE status = 'open' AND due_at IS NOT NULL;

-- Trigger updated_at (réutilise la fonction partagée de 012)
DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS : service_role only (cohérent avec prospects, contacts)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tasks IS
  'Système de tâches unifié. Tâches libres (owner_type=NULL) ou attachées à prospect/contact/centre. Récurrence simple via parent_task_id.';

COMMENT ON COLUMN public.tasks.owner_type IS
  'NULL = tâche libre. Sinon référence soft vers prospects / contacts / centres_auditifs (pas de FK car polymorphique).';

COMMENT ON COLUMN public.tasks.parent_task_id IS
  'Pointeur vers la tâche précédente dans une série récurrente. NULL = tâche originale ou non-récurrente.';

-- 2. Migration des prospects.next_action existants
-- Idempotent via NOT EXISTS
INSERT INTO public.tasks (title, owner_type, owner_id, due_at, status, created_at)
SELECT
  p.next_action AS title,
  'prospect' AS owner_type,
  p.id AS owner_id,
  p.next_action_at AS due_at,
  'open' AS status,
  COALESCE(p.updated_at, p.created_at) AS created_at
FROM public.prospects p
WHERE p.next_action IS NOT NULL
  AND trim(p.next_action) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.owner_type = 'prospect'
      AND t.owner_id = p.id
      AND t.title = p.next_action
      AND t.status = 'open'
  );

-- Note : prospects.next_action et next_action_at restent en DB pour rollback.
-- Ignorées par le front Phase 8. DROP possible en Phase 9 après validation.
