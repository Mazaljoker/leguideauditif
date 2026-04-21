-- ============================================================
-- Migration 012 : CRM interne /admin/prospects
-- Date      : 2026-04-21
-- PRD       : Docs/prd-admin-prospects.md V1.1
-- Phase     : 1 (schema + primitives UI + types)
-- ============================================================
-- Crée 2 tables : prospects (pipeline commercial mono-user) et
-- prospect_interactions (historique append-only : dm, call, email,
-- note, meeting, status_change). RLS strict : service_role only,
-- aucune policy. Seed initial commenté en fin de fichier.
-- Migration idempotente, rejouable sans erreur.
-- ============================================================

-- --- Extension requise pour gen_random_uuid() ---
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --- Fonction utilitaire updated_at (partagée avec migration 001) ---
-- CREATE OR REPLACE : sans risque si déjà définie ailleurs dans le repo.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Table prospects
-- ============================================================
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identité
  name TEXT NOT NULL,
  company TEXT,
  centres_count INT NOT NULL DEFAULT 1,
  city TEXT,
  cp TEXT,
  departement TEXT,

  -- Lien optionnel vers une fiche centre existante
  centre_id UUID REFERENCES centres_auditifs(id) ON DELETE SET NULL,

  -- Étape pipeline + canal d'acquisition
  status TEXT NOT NULL DEFAULT 'prospect',
  source TEXT NOT NULL DEFAULT 'autre',

  -- Flag Partenaire Fondateur (indépendant du statut)
  is_fondateur BOOLEAN NOT NULL DEFAULT FALSE,

  -- Prochaine action
  next_action TEXT,
  next_action_at TIMESTAMPTZ,

  -- Économique
  mrr_potentiel NUMERIC(10, 2),

  -- Notes bloc libre (court, persistant sur la ligne)
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contraintes nommées (pour pouvoir les DROP proprement plus tard)
  CONSTRAINT prospects_status_check
    CHECK (status IN ('prospect', 'contacte', 'rdv', 'proposition', 'signe', 'perdu')),
  CONSTRAINT prospects_source_check
    CHECK (source IN ('linkedin', 'rpps', 'entrant', 'autre')),
  CONSTRAINT prospects_centres_count_check
    CHECK (centres_count >= 1),
  CONSTRAINT prospects_mrr_potentiel_check
    CHECK (mrr_potentiel IS NULL OR mrr_potentiel >= 0)
);

-- --- Trigger updated_at sur prospects ---
-- PostgreSQL < 14 n'a pas CREATE OR REPLACE TRIGGER : on DROP puis CREATE.
DROP TRIGGER IF EXISTS prospects_updated_at ON prospects;
CREATE TRIGGER prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Table prospect_interactions (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS prospect_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT prospect_interactions_kind_check
    CHECK (kind IN ('dm', 'call', 'email', 'note', 'meeting', 'status_change'))
);

-- ============================================================
-- Index (YAGNI — volume V1 ≤ 100 lignes, on ajoute seulement les 3 utiles)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_prospects_status
  ON prospects (status);

-- Index partiel : seuls les quelques Fondateurs sont indexés (calcul slots)
CREATE INDEX IF NOT EXISTS idx_prospects_is_fondateur
  ON prospects (is_fondateur)
  WHERE is_fondateur = TRUE;

-- Lookup interactions par prospect (panel d'édition)
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_prospect_id
  ON prospect_interactions (prospect_id);

-- ============================================================
-- RLS : service_role only (cohérent avec claim_attributions et leads_downloads)
-- Aucune policy créée volontairement. L'accès client anon/authenticated
-- est totalement bloqué. Les endpoints admin utilisent createServerClient().
-- ============================================================
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_interactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Commentaires sémantiques
-- ============================================================
COMMENT ON TABLE prospects IS
  'CRM interne mono-utilisateur. Pipeline commercial LGA Fondateur. Accès service_role only.';

COMMENT ON COLUMN prospects.centres_count IS
  'Nombre de centres gérés par le prospect (>=1). Info commerciale, pas une jointure.';

COMMENT ON COLUMN prospects.is_fondateur IS
  'Flag Partenaire Fondateur. Indépendant du statut. Un Fondateur peut être à tout stade du pipeline.';

COMMENT ON COLUMN prospects.centre_id IS
  'Lien optionnel vers centres_auditifs. Utile pour les prospects source=entrant (revendications).';

COMMENT ON COLUMN prospects.mrr_potentiel IS
  'Montant mensuel potentiel en euros (NUMERIC 10,2). Utilisé pour la stat Propositions et col-sum MRR actif.';

COMMENT ON TABLE prospect_interactions IS
  'Historique append-only des interactions (DM, appel, email, note, RDV, changement de statut).';

COMMENT ON COLUMN prospect_interactions.kind IS
  'Type d''interaction. La valeur status_change est réservée aux mouvements kanban (drag & drop) : content = "Déplacé de {from} à {to}".';

-- ============================================================
-- SEED MANUEL (décommenter après merge, puis recommenter)
-- ============================================================
-- Format : un INSERT par prospect, idempotent via WHERE NOT EXISTS (name).
-- Pas de UNIQUE constraint sur name — l'idempotence se gère dans le INSERT.
-- Décommenter ligne par ligne, exécuter, recommenter avant commit.
-- ------------------------------------------------------------

-- 1. Anthony Athuil
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Anthony Athuil', 'Centres Athuil', 3, 'Paris', '75016', '75', 'proposition', 'linkedin', TRUE, 'Call LGA Sérénité Fondateur', '2026-04-21 14:30:00+02', 456.00, 'Offre 1200€ setup + 456€/mois (3 centres) + budget média client. Clause exit 3 mois refund. 6 ans de relation — adresser ROI zéro période précédente.'
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Anthony Athuil');

-- 2. Émilie Hardier
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Émilie Hardier', '3 centres indépendants Hainaut', 3, NULL, NULL, '59', 'rdv', 'linkedin', FALSE, 'Call découverte 06 18 51 04 57', '2026-04-21 13:45:00+02', NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Émilie Hardier');

-- 3. Piotr Gaudibert
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Piotr Gaudibert', 'Entendre Normandie', 1, NULL, NULL, '76', 'contacte', 'linkedin', FALSE, 'Proposer appel partenariat labo', '2026-04-24 00:00:00+02', NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Piotr Gaudibert');

-- 4. Guillaume Georges
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Guillaume Georges', '4 cabines Grand Est', 4, NULL, NULL, '67', 'contacte', 'linkedin', TRUE, 'Envoyer brief Fondateur + pricing', '2026-04-23 00:00:00+02', NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Guillaume Georges');

-- 5. Céline Portal
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Céline Portal', 'Audition Juan Les Pins', 1, 'Antibes', '06160', '06', 'prospect', 'entrant', FALSE, 'Email de bienvenue Fondateur', '2026-04-20 00:00:00+02', NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Céline Portal');

-- 6. Nathalye Poirot
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Nathalye Poirot', 'Audition+ Le Val-d''Ajol', 1, NULL, '88340', '88', 'prospect', 'entrant', FALSE, 'Relance après onboarding', '2026-04-29 00:00:00+02', NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Nathalye Poirot');

-- 7. Sandrine Brion Bogard
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'Sandrine Brion Bogard', 'Audition+ Contrexéville', 1, NULL, '88140', '88', 'signe', 'entrant', FALSE, 'Check-in 30 jours', '2026-05-15 00:00:00+02', NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'Sandrine Brion Bogard');

-- 8. Placeholder TBD 8
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'À compléter 8', NULL, 1, NULL, NULL, NULL, 'prospect', 'autre', FALSE, NULL, NULL, NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'À compléter 8');

-- 9. Placeholder TBD 9
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'À compléter 9', NULL, 1, NULL, NULL, NULL, 'prospect', 'autre', FALSE, NULL, NULL, NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'À compléter 9');

-- 10. Placeholder TBD 10
-- INSERT INTO prospects (name, company, centres_count, city, cp, departement, status, source, is_fondateur, next_action, next_action_at, mrr_potentiel, notes)
-- SELECT 'À compléter 10', NULL, 1, NULL, NULL, NULL, 'prospect', 'autre', FALSE, NULL, NULL, NULL, NULL
-- WHERE NOT EXISTS (SELECT 1 FROM prospects WHERE name = 'À compléter 10');

-- ============================================================
-- Fin migration 012
-- ============================================================
