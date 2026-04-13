-- ============================================================
-- Migration 008 : Documentation schema annonces + profiles
-- Ces tables existent deja en prod — cette migration documente
-- le schema pour que le repo soit la source de verite.
-- ============================================================

-- --- Profiles ---
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nom TEXT NOT NULL,
  prenom TEXT,
  email TEXT NOT NULL,
  telephone TEXT,
  profil_type TEXT CHECK (profil_type = ANY (ARRAY[
    'audioprothesiste_de', 'etudiant_audio', 'assistant_audio',
    'enseigne', 'investisseur', 'autre'
  ])),
  numero_rpps TEXT,
  centre_nom TEXT,
  centre_ville TEXT,
  centre_departement TEXT
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can read own profile') THEN
    CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- --- Annonces ---
CREATE TABLE IF NOT EXISTS annonces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  user_id UUID NOT NULL,
  contact_email TEXT NOT NULL,
  contact_tel TEXT,
  contact_nom TEXT NOT NULL,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  slug TEXT NOT NULL,
  categorie TEXT NOT NULL,
  sous_categorie TEXT,
  departement TEXT,
  ville TEXT,
  code_postal TEXT,
  region TEXT,
  prix_min INTEGER,
  prix_max INTEGER,
  prix_type TEXT,
  photos TEXT[] DEFAULT '{}',
  photo_count INTEGER,
  statut TEXT DEFAULT 'active',
  is_premium BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  boost_until TIMESTAMPTZ,
  contacts_unlocked BOOLEAN DEFAULT FALSE,
  views_count INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT
);

ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces' AND policyname = 'Annonces visibles publiquement') THEN
    CREATE POLICY "Annonces visibles publiquement" ON annonces FOR SELECT USING (statut = 'active' OR statut = 'expiree');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces' AND policyname = 'Auteur voit toutes ses annonces') THEN
    CREATE POLICY "Auteur voit toutes ses annonces" ON annonces FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces' AND policyname = 'Auteur cree ses annonces') THEN
    CREATE POLICY "Auteur cree ses annonces" ON annonces FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces' AND policyname = 'Auteur modifie ses annonces') THEN
    CREATE POLICY "Auteur modifie ses annonces" ON annonces FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces' AND policyname = 'Auteur supprime ses annonces') THEN
    CREATE POLICY "Auteur supprime ses annonces" ON annonces FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- Annonces contacts ---
CREATE TABLE IF NOT EXISTS annonces_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  annonce_id UUID NOT NULL,
  user_id UUID,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  message TEXT,
  profil TEXT,
  lu BOOLEAN DEFAULT FALSE
);

ALTER TABLE annonces_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_contacts' AND policyname = 'Proprietaire voit les contacts') THEN
    CREATE POLICY "Proprietaire voit les contacts" ON annonces_contacts FOR SELECT
      USING (EXISTS (SELECT 1 FROM annonces WHERE annonces.id = annonces_contacts.annonce_id AND annonces.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_contacts' AND policyname = 'Tout le monde peut envoyer un contact') THEN
    CREATE POLICY "Tout le monde peut envoyer un contact" ON annonces_contacts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- --- Annonces paiements ---
CREATE TABLE IF NOT EXISTS annonces_paiements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL,
  annonce_id UUID NOT NULL,
  stripe_session_id TEXT NOT NULL,
  stripe_payment_intent TEXT,
  produit TEXT NOT NULL,
  montant INTEGER NOT NULL,
  statut TEXT DEFAULT 'pending'
);

ALTER TABLE annonces_paiements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_paiements' AND policyname = 'User voit ses paiements') THEN
    CREATE POLICY "User voit ses paiements" ON annonces_paiements FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_paiements' AND policyname = 'Insert via service role') THEN
    CREATE POLICY "Insert via service role" ON annonces_paiements FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- --- Annonces alertes ---
CREATE TABLE IF NOT EXISTS annonces_alertes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL,
  categorie TEXT NOT NULL,
  sous_categorie TEXT,
  departements TEXT[],
  prix_max INTEGER,
  frequence TEXT DEFAULT 'hebdo',
  active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ
);

ALTER TABLE annonces_alertes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_alertes' AND policyname = 'User voit ses alertes') THEN
    CREATE POLICY "User voit ses alertes" ON annonces_alertes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_alertes' AND policyname = 'User cree ses alertes') THEN
    CREATE POLICY "User cree ses alertes" ON annonces_alertes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_alertes' AND policyname = 'User modifie ses alertes') THEN
    CREATE POLICY "User modifie ses alertes" ON annonces_alertes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_alertes' AND policyname = 'User supprime ses alertes') THEN
    CREATE POLICY "User supprime ses alertes" ON annonces_alertes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- --- Annonces signalements ---
CREATE TABLE IF NOT EXISTS annonces_signalements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  annonce_id UUID NOT NULL,
  user_id UUID,
  raison TEXT NOT NULL,
  details TEXT
);

ALTER TABLE annonces_signalements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_signalements' AND policyname = 'Tout le monde peut signaler') THEN
    CREATE POLICY "Tout le monde peut signaler" ON annonces_signalements FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'annonces_signalements' AND policyname = 'User voit ses signalements') THEN
    CREATE POLICY "User voit ses signalements" ON annonces_signalements FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
