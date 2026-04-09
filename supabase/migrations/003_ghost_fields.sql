-- ============================================================
-- Migration 003 : Champs ghost pattern + revendication gratuite
-- ============================================================

-- Champs premium (affichage ghost quand null)
ALTER TABLE centres_auditifs ADD COLUMN email TEXT;
ALTER TABLE centres_auditifs ADD COLUMN photo_url TEXT;
ALTER TABLE centres_auditifs ADD COLUMN specialites TEXT[] DEFAULT '{}';
ALTER TABLE centres_auditifs ADD COLUMN marques TEXT[] DEFAULT '{}';
ALTER TABLE centres_auditifs ADD COLUMN reseaux_sociaux JSONB DEFAULT '{}';
ALTER TABLE centres_auditifs ADD COLUMN verifie BOOLEAN NOT NULL DEFAULT FALSE;

-- Revendication gratuite (independant de is_premium / Stripe)
ALTER TABLE centres_auditifs ADD COLUMN claimed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE centres_auditifs ADD COLUMN claimed_by_name TEXT;
ALTER TABLE centres_auditifs ADD COLUMN claimed_by_adeli TEXT;
