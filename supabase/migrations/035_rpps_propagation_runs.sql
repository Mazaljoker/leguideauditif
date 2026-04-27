-- 035_rpps_propagation_runs.sql
-- Sprint propagation : applique les changements de rpps_audioprothesistes vers
-- les fiches publiques centres_auditifs. Sans ce maillon, la sync FHIR
-- (sprint 034) reste invisible côté site.
--
-- Architecture :
--   API FHIR → rpps_audioprothesistes (sync, sprint 034)
--                      ↓
--             rpps_propagation_runs (cette migration)
--                      ↓
--              centres_auditifs (fiches publiques)
--
-- Trigger : cron Vercel 30 min après chaque sync RPPS (04:30 le 1er + 15) ou
--           bouton manuel admin avec mode dry-run.
--
-- Protection : les fiches claimed/premium ou claim_status='approved' ne sont
-- JAMAIS modifiées automatiquement (le pro contrôle sa fiche). Elles sont
-- listées en `flagged_for_review` pour décision humaine.

CREATE TABLE IF NOT EXISTS public.rpps_propagation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'cron')),
  apply_mode BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE = dry-run, TRUE = écrit en DB
  -- Bornage temporel : on propage les changements depuis la dernière propag réussie
  since_iso TIMESTAMPTZ,
  -- Compteurs
  centres_created INT DEFAULT 0,           -- nouveaux RPPS sans match → fiches plan='rpps' créées
  centres_updated INT DEFAULT 0,           -- match prio 1/2 trouvé, fiche non claimed → updated
  centres_skipped_claimed INT DEFAULT 0,   -- match trouvé mais claimed/premium → skip
  centres_unmatched INT DEFAULT 0,         -- aucun match prio 1/2 trouvé (V2 : fuzzy match)
  -- Détails (JSONB) pour rapport email + page admin
  flagged_for_review JSONB DEFAULT '[]'::jsonb,  -- fiches claimed avec change RPPS détecté
  changes_applied JSONB DEFAULT '[]'::jsonb,     -- updates effectués (ou simulés en dry-run)
  error_message TEXT,
  duration_seconds INT
);

CREATE INDEX IF NOT EXISTS idx_rpps_propagation_runs_started_at
  ON public.rpps_propagation_runs (started_at DESC);

COMMENT ON TABLE public.rpps_propagation_runs IS
  'Log des propagations RPPS → centres_auditifs. Une ligne par exécution. Affichée dans /admin/rpps-propagate.';
COMMENT ON COLUMN public.rpps_propagation_runs.apply_mode IS
  'FALSE = dry-run (rien écrit en DB, juste preview). TRUE = changes appliqués.';
COMMENT ON COLUMN public.rpps_propagation_runs.flagged_for_review IS
  'Array JSON des fiches claimed/premium pour lesquelles un change RPPS a été détecté. Format : [{centre_slug, centre_id, claimed_by_email, rpps, old_address, new_address, change_summary}]. À review au cas par cas.';
COMMENT ON COLUMN public.rpps_propagation_runs.changes_applied IS
  'Array JSON des updates effectifs (ou simulés en dry-run). Format : [{centre_id, action: "create"|"update", fields_changed: {...}}].';

ALTER TABLE public.rpps_propagation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY rpps_propagation_runs_service_role_only ON public.rpps_propagation_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
