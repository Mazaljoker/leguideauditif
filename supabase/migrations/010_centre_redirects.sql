-- Table de redirects 301 pour les centres dont le slug change.
-- Utilisée par le chantier de ré-import FINESS/INSEE (2026-04-20) et
-- réutilisable pour tout changement futur de slug centre.
--
-- Le middleware Astro (src/middleware.ts) consulte cette table quand
-- /centre/{slug} ne trouve pas de centre, et émet un 301 si match.

CREATE TABLE IF NOT EXISTS centre_redirects (
  old_slug       text PRIMARY KEY,
  new_slug       text NOT NULL,
  reason         text NOT NULL DEFAULT 'reimport',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Index pour lookup inverse (utile en admin pour voir les redirects sortants)
CREATE INDEX IF NOT EXISTS centre_redirects_new_slug_idx
  ON centre_redirects (new_slug);

-- RLS : lecture publique (le middleware tourne côté serveur avec anon key)
ALTER TABLE centre_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique centre_redirects"
  ON centre_redirects FOR SELECT
  USING (true);

-- Seul le service_role peut écrire (via les scripts admin)
COMMENT ON TABLE centre_redirects IS 'Redirects 301 pour slugs centre modifiés (ré-import FINESS, renommages, etc.)';
