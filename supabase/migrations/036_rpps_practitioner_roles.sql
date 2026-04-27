-- 036_rpps_practitioner_roles.sql
-- V2 du pipeline RPPS : capture les multi-lieux d'exercice par praticien.
--
-- Contexte : signal Thomas Perron (Manéo Bayonne, 27 avril 2026) — la sync V1
-- (mig 034) ne capturait que l'adresse Practitioner principale (Pessac), pas
-- les autres lieux d'exercice (Bayonne depuis octobre 2024). En FHIR, les
-- lieux d'exercice sont sur PractitionerRole, pas sur Practitioner.
--
-- Architecture :
--   rpps_audioprothesistes (V1, 1 ligne / praticien) ← inchangée
--                ↓ FK
--   rpps_practitioner_roles (V2, 1 ligne / lieu d'exercice par praticien)

CREATE TABLE IF NOT EXISTS public.rpps_practitioner_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Lien vers le praticien (FK logique vers rpps_audioprothesistes.rpps)
  rpps TEXT NOT NULL,
  -- Identifiant FHIR du PractitionerRole (utile pour upsert + suivi)
  role_id TEXT NOT NULL,
  -- Données de l'organisation/lieu d'exercice
  siret TEXT,
  raison_sociale TEXT,
  enseigne TEXT,
  -- Adresse du lieu (éclatée comme rpps_audioprothesistes)
  num_voie TEXT,
  type_voie TEXT,
  voie TEXT,
  code_postal TEXT,
  commune TEXT,
  pays TEXT DEFAULT 'FR',
  departement_code TEXT,
  -- Contact spécifique au lieu
  telephone TEXT,
  email TEXT,
  -- État administratif côté FHIR
  active BOOLEAN DEFAULT true,
  period_start DATE,
  period_end DATE,
  -- Tracking sync
  etat_role TEXT DEFAULT 'actif' CHECK (etat_role IN ('actif', 'inactif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Unicité : un rpps peut avoir plusieurs lieux MAIS chaque (rpps, role_id)
  -- doit être unique pour permettre upsert idempotent
  CONSTRAINT rpps_practitioner_roles_rpps_role_unique UNIQUE (rpps, role_id)
);

-- Indexes pour les queries fréquentes
CREATE INDEX IF NOT EXISTS idx_rpps_roles_rpps ON public.rpps_practitioner_roles (rpps);
CREATE INDEX IF NOT EXISTS idx_rpps_roles_siret ON public.rpps_practitioner_roles (siret);
CREATE INDEX IF NOT EXISTS idx_rpps_roles_cp ON public.rpps_practitioner_roles (code_postal);
CREATE INDEX IF NOT EXISTS idx_rpps_roles_etat ON public.rpps_practitioner_roles (etat_role);
CREATE INDEX IF NOT EXISTS idx_rpps_roles_updated_at ON public.rpps_practitioner_roles (updated_at DESC);

COMMENT ON TABLE public.rpps_practitioner_roles IS
  'Multi-lieux d''exercice par praticien (FHIR PractitionerRole). 1 ligne par lieu. Un audio peut avoir 2-5 lieux. Sync V2 ajoutee 27 avril 2026.';
COMMENT ON COLUMN public.rpps_practitioner_roles.role_id IS
  'Identifiant FHIR du PractitionerRole. Utilise comme clé d''upsert pour idempotence.';
COMMENT ON COLUMN public.rpps_practitioner_roles.period_start IS
  'Date de début du rôle (depuis quand le praticien exerce ici). Source : PractitionerRole.period.start.';
COMMENT ON COLUMN public.rpps_practitioner_roles.etat_role IS
  'actif = role vu lors du dernier run de sync. inactif = role retire du flux FHIR (depart, fermeture).';

ALTER TABLE public.rpps_practitioner_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY rpps_roles_service_role_only ON public.rpps_practitioner_roles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
