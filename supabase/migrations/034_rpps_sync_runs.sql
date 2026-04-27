-- 034_rpps_sync_runs.sql
-- Industrialise la sync bi-mensuelle du RPPS depuis FHIR (gateway.api.esante.gouv.fr).
--
-- Contexte : signal terrain Thomas Perron (Manéo Bayonne, 27 avril 2026) — son audio
-- rattaché RPPS apparaît à PESSAC OPTICAL (ancien centre il y a ~8 mois) au lieu de
-- son centre actuel. Le RPPS en base est un snapshot statique du 10 avril 2026, jamais
-- resynchronisé. Cette migration prépare le tracking des sync runs et le marquage
-- inactif des RPPS qui ne reviennent plus dans le flux FHIR.

-- Tracking par ligne RPPS
ALTER TABLE public.rpps_audioprothesistes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS etat_rpps TEXT DEFAULT 'actif' CHECK (etat_rpps IN ('actif', 'inactif')),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_rpps_etat_rpps ON public.rpps_audioprothesistes (etat_rpps);
CREATE INDEX IF NOT EXISTS idx_rpps_updated_at ON public.rpps_audioprothesistes (updated_at DESC);

-- Log des exécutions de sync (1 ligne par run, manuelle ou cron)
CREATE TABLE IF NOT EXISTS public.rpps_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  trigger_source TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'cron')),
  rpps_count_before INT,
  rpps_count_after INT,
  rpps_inserted INT DEFAULT 0,
  rpps_updated INT DEFAULT 0,
  rpps_marked_inactive INT DEFAULT 0,
  new_centres_detected JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  duration_seconds INT
);

CREATE INDEX IF NOT EXISTS idx_rpps_sync_runs_started_at ON public.rpps_sync_runs (started_at DESC);

COMMENT ON TABLE public.rpps_sync_runs IS
  'Log des synchronisations du RPPS depuis FHIR. Une ligne par exécution (manuelle ou cron). Affichée dans /admin/rpps-sync.';
COMMENT ON COLUMN public.rpps_sync_runs.new_centres_detected IS
  'Array JSON des nouvelles ouvertures détectées (RPPS jamais vus avant), pour rapport email Franck-Olivier. Format : [{rpps, nom, prenom, raison_sociale, code_postal, commune}].';
COMMENT ON COLUMN public.rpps_audioprothesistes.etat_rpps IS
  'actif = RPPS vu lors du dernier run de sync. inactif = RPPS retiré du flux FHIR (départ, retraite, radiation).';
COMMENT ON COLUMN public.rpps_audioprothesistes.last_seen_at IS
  'Dernier passage où ce RPPS est apparu dans le flux FHIR. Sert à dater la disparition pour les RPPS marqués inactifs.';

-- RLS : la table sync_runs est admin-only.
ALTER TABLE public.rpps_sync_runs ENABLE ROW LEVEL SECURITY;

-- Policy : seul service_role peut lire/écrire (les API routes admin utilisent service_role).
-- Pas de policy pour authenticated → bloqué par défaut, OK pour CRM admin.
CREATE POLICY rpps_sync_runs_service_role_only ON public.rpps_sync_runs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
