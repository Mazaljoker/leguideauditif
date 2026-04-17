-- ============================================================
-- Migration 009 : Table claim_attributions (append-only)
--
-- Stocke la source d'acquisition (UTM, gclid, referrer, client_id GA4)
-- au moment de la soumission du formulaire de revendication.
-- Une ligne par tentative de claim — préserve l'historique si un centre
-- est re-revendiqué après rejet.
--
-- Finalité RGPD : attribution marketing. Rétention 13 mois (purge auto
-- alignée sur les recommandations CNIL pour cookies analytics).
-- ============================================================

CREATE TABLE IF NOT EXISTS claim_attributions (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Clé business : slug + id du centre + email du claimer
  centre_slug TEXT NOT NULL,
  centre_id UUID,
  claimed_by_email TEXT NOT NULL,

  -- UUID partagé avec GA4 (event client + MP serveur) pour dédup COUNT DISTINCT
  transaction_id UUID UNIQUE,

  -- Attribution first-touch (capturée au landing)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  gclid TEXT,
  fbclid TEXT,
  msclkid TEXT,
  referrer TEXT,
  landing_page TEXT,

  -- Identifiants GA4 pour rattachement cross-device + Measurement Protocol
  ga_client_id TEXT,
  ga_session_id TEXT,

  -- Contexte technique
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_claim_attr_centre_slug ON claim_attributions(centre_slug);
CREATE INDEX IF NOT EXISTS idx_claim_attr_created_at ON claim_attributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claim_attr_utm_source ON claim_attributions(utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_claim_attr_transaction_id ON claim_attributions(transaction_id);

-- RLS : seul le backend (service_role) écrit et lit cette table.
-- Les audioprothésistes ne doivent pas voir leur propre source d'acquisition.
ALTER TABLE claim_attributions ENABLE ROW LEVEL SECURITY;

-- Aucune policy SELECT/INSERT créée : service_role bypass RLS,
-- et on veut bloquer l'accès anon/authenticated par défaut.

COMMENT ON TABLE claim_attributions IS 'Attribution marketing des revendications de centres. Append-only. Rétention 13 mois.';
