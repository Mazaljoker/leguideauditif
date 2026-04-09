-- Table pour stocker les leads de telechargement de fiches techniques
CREATE TABLE IF NOT EXISTS leads_downloads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text NOT NULL,
  product_slug text,
  product_name text,
  pdf_url text,
  source text DEFAULT 'fiche-technique',
  created_at timestamptz DEFAULT now()
);

-- Index pour recherche par email et par produit
CREATE INDEX IF NOT EXISTS idx_leads_downloads_email ON leads_downloads (email);
CREATE INDEX IF NOT EXISTS idx_leads_downloads_product ON leads_downloads (product_slug);
CREATE INDEX IF NOT EXISTS idx_leads_downloads_created ON leads_downloads (created_at DESC);

-- RLS : insert uniquement via service_role (API server-side)
ALTER TABLE leads_downloads ENABLE ROW LEVEL SECURITY;

-- Politique : pas d'acces direct depuis le client anon
-- Les inserts se font via l'API /api/download-lead avec service_role
