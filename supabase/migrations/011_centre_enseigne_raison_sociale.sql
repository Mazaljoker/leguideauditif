-- Séparation nom commercial / raison sociale / affichage sur centres_auditifs.
-- Motivation : aujourd'hui la colonne `nom` mélange raison sociale brute INSEE
-- ("SELL GANT DA ZVISKOUARN") et nom commercial exploitable ("Audition Conseil
-- Carantec"). La réconciliation RPPS↔INSEE (cf. scripts/etl-rpps-enrich-
-- insee-orphans.mjs) écrase `nom` vers l'enseigne RPPS et stocke les deux
-- originaux dans les colonnes dédiées ajoutées ici.
--
-- Schema.org : `nom` → LocalBusiness.name, `raison_sociale` → LocalBusiness.legalName.

ALTER TABLE centres_auditifs
  ADD COLUMN IF NOT EXISTS enseigne text,
  ADD COLUMN IF NOT EXISTS raison_sociale text;

-- Index partiel pour accélérer les lookups par SIRET (matching RPPS↔centres).
-- Utilisé par le script de réconciliation Pass 1 (SIRET exact, 339 fiches).
CREATE INDEX IF NOT EXISTS centres_auditifs_siret_lookup_idx
  ON centres_auditifs (siret)
  WHERE siret IS NOT NULL;

COMMENT ON COLUMN centres_auditifs.enseigne
  IS 'Enseigne commerciale RPPS (ex: "Audition Conseil"). Null si inconnue.';
COMMENT ON COLUMN centres_auditifs.raison_sociale
  IS 'Raison sociale INSEE/SIRENE brute (ex: "SELL GANT DA ZVISKOUARN"). Conservée pour Schema.org legalName.';
