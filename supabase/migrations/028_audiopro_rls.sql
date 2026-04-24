-- ============================================================
-- Migration 028 : RLS sur les tables du pipeline email (Phase 1)
-- Date         : 2026-04-24
-- Specs data   : docs/phase1-email-pipeline/specs-phase1-data.md v1.0 §3
-- ============================================================
-- Comportement Phase 1 :
--   - Écriture : uniquement service_role (endpoints serveur via
--     createServerClient()). Le service_role bypasse RLS par défaut
--     — pas besoin de policy.
--   - Lecture publique : AUCUNE. Ces tables sont 100% internes.
--   - Lecture audio authentifié : reportée Phase 2 (espace pro).
--
-- Cohérent avec prospects, claim_attributions, leads_downloads :
-- ENABLE RLS sans créer de policy = blocage total pour anon/authenticated.
-- ============================================================

ALTER TABLE audiopro_lifecycle         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiopro_centres           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiopro_lifecycle_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags              ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Phase 2 (à faire plus tard) :
--   - Policy SELECT sur audiopro_lifecycle pour que l'audio
--     authentifié lise SA propre ligne (via auth.email()).
--   - Policy SELECT sur audiopro_centres filtrée par audiopro_id
--     de la ligne parente.
--   - Policy SELECT sur email_events filtrée par audiopro_id.
-- ============================================================

-- ============================================================
-- Fin migration 028
-- ============================================================
