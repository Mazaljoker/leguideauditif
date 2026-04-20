-- Création manuelle des 5 pros RPPS Savoie absents de centres_auditifs.
-- Diagnostic 2026-04-20 : ETL rpps_audioprothesistes → centres_auditifs
-- n'a pas été relancé sur le delta post-2026-04-08. 3 200 pros manquants
-- au national (44.8% du fichier RPPS).
--
-- Ce script ne traite que les 5 Savoie urgents. Pour le rattrapage
-- national, voir Docs/plan-etl-rpps-to-centres.md (à créer).
--
-- Géocodages vérifiés via BAN (api-adresse.data.gouv.fr).
-- Note : Beauquis + Lezier partagent SIRET 326465770 et adresse (même
-- magasin Écouter Voir Cognin) → 2 fiches créées (1 par RPPS) — à
-- déduplicater via script plus tard si souhaité.

BEGIN;

-- 1. Mélanie RIGAUD (Sonance Audition, Drumettaz-Clarafond)
INSERT INTO centres_auditifs (
  id, slug, nom, adresse, cp, ville, departement,
  lat, lng, siret, rpps, plan, source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'sonance-audition-drumettaz-clarafond-73420-rigaud',
  'SONANCE AUDITION',
  '376 Avenue du Golf',
  '73420', 'Drumettaz-Clarafond', '73',
  45.664198, 5.909014,
  '82910537800014', '10009798850',
  'rpps', 'rpps_manual_2026-04-20',
  now(), now()
);

-- 2. Bertrand BEAUQUIS (Écouter Voir Cognin)
INSERT INTO centres_auditifs (
  id, slug, nom, adresse, cp, ville, departement,
  lat, lng, siret, rpps, plan, source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'ecouter-voir-audition-mutualiste-cognin-73160-beauquis',
  'ECOUTER VOIR AUDITION MUTUALISTE',
  'Centre Commercial Rue de l''Épine',
  '73160', 'Cognin', '73',
  45.56221, 5.894547,
  '32646577000203', '10008767823',
  'rpps', 'rpps_manual_2026-04-20',
  now(), now()
);

-- 3. Amélie LEZIER (même magasin Écouter Voir Cognin — 2e RPPS)
INSERT INTO centres_auditifs (
  id, slug, nom, adresse, cp, ville, departement,
  lat, lng, siret, rpps, plan, source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'ecouter-voir-audition-mutualiste-cognin-73160-lezier',
  'ECOUTER VOIR AUDITION MUTUALISTE',
  'Centre Commercial Rue de l''Épine',
  '73160', 'Cognin', '73',
  45.56221, 5.894547,
  '32646577000203', '10009906131',
  'rpps', 'rpps_manual_2026-04-20',
  now(), now()
);

-- 4. Bénédicte OUDIN (My Audition, Cognin)
INSERT INTO centres_auditifs (
  id, slug, nom, adresse, cp, ville, departement,
  lat, lng, siret, rpps, plan, source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'my-audition-cognin-73160-oudin',
  'MY AUDITION',
  '16 Route de Lyon',
  '73160', 'Cognin', '73',
  45.561931, 5.898583,
  '91830149000010', '10008462854',
  'rpps', 'rpps_manual_2026-04-20',
  now(), now()
);

-- 5. Florian CAMINET (Ugine — pas d'enseigne en RPPS)
INSERT INTO centres_auditifs (
  id, slug, nom, adresse, cp, ville, departement,
  lat, lng, siret, rpps, plan, source, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  'florian-caminet-audioprothesiste-ugine-73400',
  'Florian Caminet Audioprothésiste',
  '19 Avenue Paul Girod',
  '73400', 'Ugine', '73',
  45.745816, 6.422364,
  '80416621300020', '10008762840',
  'rpps', 'rpps_manual_2026-04-20',
  now(), now()
);

-- Vérification post-INSERT
SELECT slug, nom, ville, cp, rpps
FROM centres_auditifs
WHERE rpps IN (
  '10009798850','10008767823','10009906131','10008462854','10008762840'
)
ORDER BY cp;

COMMIT;

-- URLs attendues après commit :
--   /centre/sonance-audition-drumettaz-clarafond-73420-rigaud/
--   /centre/ecouter-voir-audition-mutualiste-cognin-73160-beauquis/
--   /centre/ecouter-voir-audition-mutualiste-cognin-73160-lezier/
--   /centre/my-audition-cognin-73160-oudin/
--   /centre/florian-caminet-audioprothesiste-ugine-73400/
