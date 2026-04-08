-- ============================================================
-- Migration 001 : Table centres_auditifs (annuaire freemium)
-- ============================================================

CREATE TABLE centres_auditifs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identifiant legacy (mapping vers audioprothesistes.json)
  legacy_id TEXT NOT NULL,

  -- Slug URL unique pour la fiche centre
  slug TEXT NOT NULL UNIQUE,

  -- Informations du centre
  nom TEXT NOT NULL,
  adresse TEXT NOT NULL,
  cp TEXT NOT NULL,
  ville TEXT,
  departement TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  siret TEXT,
  tel TEXT,
  horaires TEXT,
  site_web TEXT,
  finess TEXT,
  source TEXT NOT NULL DEFAULT 'rpps',

  -- Champs freemium
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  claimed_by_email TEXT,
  claimed_at TIMESTAMPTZ,
  premium_since TIMESTAMPTZ,
  premium_until TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requetes courantes
CREATE INDEX idx_centres_departement ON centres_auditifs(departement);
CREATE INDEX idx_centres_cp ON centres_auditifs(cp);
CREATE INDEX idx_centres_is_premium ON centres_auditifs(is_premium);
CREATE INDEX idx_centres_geo ON centres_auditifs(lat, lng);
CREATE INDEX idx_centres_stripe ON centres_auditifs(stripe_customer_id);

-- Trigger mise a jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER centres_auditifs_updated
  BEFORE UPDATE ON centres_auditifs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS : lecture publique, ecriture service_role uniquement
ALTER TABLE centres_auditifs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read centres"
  ON centres_auditifs
  FOR SELECT
  USING (true);
