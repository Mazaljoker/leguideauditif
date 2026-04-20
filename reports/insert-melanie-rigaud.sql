-- Création manuelle fiche Mélanie Rigaud (RPPS 10009798850)
-- Cas urgence — à exécuter dans Supabase SQL Editor pour tenir
-- engagement "dans l'heure". Data source : rpps_audioprothesistes
-- id 61bac0f2-6cd7-4480-8ec7-bddd1a3a0618 (créée 2026-04-10 08:12)
--
-- Géocodage BAN vérifié : 45.664198, 5.909014 (score 0.95)
-- Adresse normalisée : "376 Avenue du golf, 73420 Drumettaz-Clarafond"
--
-- Plan='rpps' pour entrer dans le workflow standard de revendication.
-- Mélanie pourra revendiquer ensuite via /revendiquer-gratuit/?centre=...

INSERT INTO centres_auditifs (
  id,
  slug,
  nom,
  adresse,
  cp,
  ville,
  departement,
  lat,
  lng,
  siret,
  rpps,
  plan,
  source,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'sonance-audition-drumettaz-clarafond-73420-rigaud',
  'SONANCE AUDITION',
  '376 Avenue du Golf',
  '73420',
  'Drumettaz-Clarafond',
  '73',
  45.664198,
  5.909014,
  '82910537800014',
  '10009798850',
  'rpps',
  'rpps_manual_2026-04-20',
  now(),
  now()
);

-- Vérification post-INSERT :
SELECT id, slug, nom, ville, cp, rpps, siret, lat, lng, plan
FROM centres_auditifs
WHERE rpps = '10009798850';

-- URL attendue après ce INSERT :
-- https://leguideauditif.fr/centre/sonance-audition-drumettaz-clarafond-73420-rigaud/
