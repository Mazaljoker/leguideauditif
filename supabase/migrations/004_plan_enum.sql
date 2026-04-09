-- ============================================================
-- Migration 004 : Enum plan (rpps/claimed/premium) + a_propos
-- Remplace les booleans claimed/verifie/is_premium par un seul champ plan
-- ============================================================

-- Ajout colonne plan (text car Supabase ALTER TYPE est contraignant)
ALTER TABLE centres_auditifs ADD COLUMN plan TEXT NOT NULL DEFAULT 'rpps';

-- Ajout champ "a propos" (texte libre de l'audio)
ALTER TABLE centres_auditifs ADD COLUMN a_propos TEXT;

-- Migration des donnees existantes
UPDATE centres_auditifs SET plan = 'premium' WHERE is_premium = TRUE;
UPDATE centres_auditifs SET plan = 'claimed' WHERE claimed = TRUE AND is_premium = FALSE;

-- Contrainte check pour valider les valeurs
ALTER TABLE centres_auditifs ADD CONSTRAINT centres_plan_check CHECK (plan IN ('rpps', 'claimed', 'premium'));

-- Index sur plan (remplace idx_centres_is_premium)
CREATE INDEX idx_centres_plan ON centres_auditifs(plan);
DROP INDEX IF EXISTS idx_centres_is_premium;
