-- ============================================================
-- Migration 025 : Multi-audios par centre (Premium only)
-- ============================================================
-- Table pivot centre <-> audioprothésiste RPPS avec rôles
-- (titulaire + N collaborateurs). Remplace progressivement les
-- colonnes audio_* directes de centres_auditifs. Le backfill
-- final copie les Premium actuels comme 'titulaire' pour garder
-- l'UI publique fonctionnelle dès le déploiement.

-- Pré-requis FK : rpps_audioprothesistes.rpps doit être UNIQUE
-- (7146 lignes, 7146 distincts, 0 null — vérifié avant migration).
-- L'index existant portait uniquement la PK id, pas rpps.
ALTER TABLE rpps_audioprothesistes
  ADD CONSTRAINT rpps_audioprothesistes_rpps_key UNIQUE (rpps);

CREATE TABLE centre_audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres_auditifs(id) ON DELETE CASCADE,
  rpps TEXT NOT NULL REFERENCES rpps_audioprothesistes(rpps) ON DELETE RESTRICT,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'collaborateur' CHECK (role IN ('titulaire', 'collaborateur')),
  ordre INT NOT NULL DEFAULT 0,
  photo_url TEXT,
  bio TEXT,
  annee_dip INT CHECK (annee_dip IS NULL OR annee_dip BETWEEN 1960 AND EXTRACT(YEAR FROM NOW())::INT),
  associations TEXT[] NOT NULL DEFAULT '{}',
  specialite TEXT CHECK (specialite IS NULL OR specialite IN (
    'acouphenes', 'pediatrie', 'implants', '100_sante',
    'presbyacousie', 'hyperacousie', 'protection', 'autre'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (centre_id, rpps)
);

CREATE INDEX idx_centre_audios_centre ON centre_audios(centre_id, ordre);
CREATE INDEX idx_centre_audios_rpps ON centre_audios(rpps);

ALTER TABLE centre_audios ENABLE ROW LEVEL SECURITY;

-- Lecture publique : la fiche /centre/[slug] doit rendre la team
-- à tout visiteur. Les writes passent exclusivement par les
-- endpoints API serveur qui utilisent createServerClient
-- (service role), donc pas de policy write publique nécessaire.
CREATE POLICY "Public read centre_audios"
  ON centre_audios
  FOR SELECT
  USING (true);

-- Backfill : pour chaque Premium avec un RPPS déjà rempli,
-- créer la ligne 'titulaire' correspondante à partir des
-- colonnes centres_auditifs.audio_*. Idempotent via ON CONFLICT.
INSERT INTO centre_audios (
  centre_id, rpps, prenom, nom, role, ordre,
  photo_url, bio, annee_dip, associations
)
SELECT
  id,
  rpps,
  COALESCE(
    NULLIF(audio_prenom, ''),
    NULLIF(split_part(trim(claimed_by_name), ' ', 1), ''),
    'Audio'
  ),
  COALESCE(
    NULLIF(audio_nom, ''),
    NULLIF(regexp_replace(trim(claimed_by_name), '^\S+\s+', ''), ''),
    'DE'
  ),
  'titulaire',
  0,
  audio_photo_url,
  audio_bio,
  audio_annee_dip,
  COALESCE(audio_associations, '{}'::text[])
FROM centres_auditifs
WHERE plan = 'premium'
  AND rpps IS NOT NULL
  -- Filtre : seulement les RPPS présents dans le répertoire officiel.
  -- Les RPPS fakes injectés sur les fiches démo (10001234567 / 10002345671-3)
  -- ne passent pas la FK. Les démos gardent leur affichage public via
  -- les colonnes centres_auditifs.audio_* (fallback legacy conservé).
  AND rpps IN (SELECT rpps FROM rpps_audioprothesistes)
ON CONFLICT (centre_id, rpps) DO NOTHING;
