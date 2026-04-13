-- ============================================================
-- Migration 007 : Enrichissement INSEE (API Sirene 3.11)
-- Colonnes supplementaires pour prospection nouveaux centres
-- ============================================================

-- Date de creation de l'etablissement (SIRET)
ALTER TABLE centres_auditifs ADD COLUMN date_creation_etablissement DATE;

-- Date de creation de l'entreprise (SIREN)
ALTER TABLE centres_auditifs ADD COLUMN date_creation_entreprise DATE;

-- Etat administratif : A = actif, F = ferme
ALTER TABLE centres_auditifs ADD COLUMN etat_administratif TEXT DEFAULT 'A';

-- Categorie juridique INSEE (ex: 5710 = SAS, 5499 = SARL, 1000 = entrepreneur individuel)
ALTER TABLE centres_auditifs ADD COLUMN categorie_juridique TEXT;

-- Tranche effectifs etablissement (ex: 00 = 0, 01 = 1-2, 02 = 3-5, 03 = 6-9...)
ALTER TABLE centres_auditifs ADD COLUMN tranche_effectifs TEXT;

-- Categorie entreprise (PME, ETI, GE)
ALTER TABLE centres_auditifs ADD COLUMN categorie_entreprise TEXT;

-- Code NAF activite principale (47.74Z = optique/audio)
ALTER TABLE centres_auditifs ADD COLUMN code_naf TEXT;

-- Est-ce le siege social ?
ALTER TABLE centres_auditifs ADD COLUMN est_siege BOOLEAN DEFAULT FALSE;

-- Nombre d'etablissements actifs de l'entreprise (1 = mono-centre = independant)
ALTER TABLE centres_auditifs ADD COLUMN nombre_etablissements INTEGER;

-- Date du dernier enrichissement INSEE
ALTER TABLE centres_auditifs ADD COLUMN insee_enriched_at TIMESTAMPTZ;

-- Index pour les requetes de prospection
CREATE INDEX idx_centres_date_creation ON centres_auditifs(date_creation_etablissement);
CREATE INDEX idx_centres_etat_admin ON centres_auditifs(etat_administratif);
CREATE INDEX idx_centres_cat_juridique ON centres_auditifs(categorie_juridique);

-- Vue : nouveaux centres (crees dans les 12 derniers mois, actifs, independants)
CREATE OR REPLACE VIEW v_nouveaux_centres AS
SELECT
  id, nom, adresse, cp, ville, departement, tel, siret,
  date_creation_etablissement,
  date_creation_entreprise,
  categorie_juridique,
  tranche_effectifs,
  categorie_entreprise,
  est_siege,
  nombre_etablissements,
  claimed_by_email,
  is_premium
FROM centres_auditifs
WHERE etat_administratif = 'A'
  AND date_creation_etablissement >= (CURRENT_DATE - INTERVAL '12 months')
ORDER BY date_creation_etablissement DESC;

-- Vue : centres independants (cible prospection prioritaire)
CREATE OR REPLACE VIEW v_centres_independants AS
SELECT
  id, nom, adresse, cp, ville, departement, tel, siret,
  date_creation_etablissement,
  categorie_juridique,
  tranche_effectifs,
  est_siege,
  nombre_etablissements,
  claimed_by_email,
  is_premium
FROM centres_auditifs
WHERE etat_administratif = 'A'
  AND (nombre_etablissements IS NULL OR nombre_etablissements <= 3)
  AND categorie_entreprise IN ('PME', NULL)
ORDER BY date_creation_etablissement DESC NULLS LAST;
