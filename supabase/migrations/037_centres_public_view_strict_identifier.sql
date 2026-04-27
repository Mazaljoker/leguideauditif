-- 037_centres_public_view_strict_identifier.sql
-- Durcit `v_centres_auditifs_public` (mig 033) : impose qu'une fiche affichée
-- publiquement ait AU MOINS un identifiant officiel vérifiable :
--   - rpps (Annuaire Santé FHIR — gateway Gravitee gouv) OU
--   - siret (INSEE SIRENE — base entreprises gouv)
--
-- EXCEPTION : claim_status='approved' (audioprothésiste revendicateur déjà
-- validé manuellement par l'admin LGA). Cohérent avec le pattern de la mig 033
-- qui faisait déjà cette exception pour etat_administratif='C'. Les fiches
-- claim approved sans rpps/siret bénéficient d'une vérification humaine
-- antérieure → on garde l'historique sans rétro-couper l'engagement.
-- Cas concrets : Audio Bertrand (Castelnau-d'Estrétefonds), Audiosphere (Houilles).
--
-- Décision Franck-Olivier 27/04/2026 (signal Amandine BEHURET) : la qualité
-- éditoriale E-E-A-T LGA exige qu'un centre AFFICHÉ NEUF soit traçable côté
-- source publique. Les claims historiques sont préservés.
--
-- Audit 27/04/2026 : 108 fiches violent cette règle (sur 9389 non-demo).
--   - 103 source='rpps' (imports CSV historiques sans SIRET récupéré) → masquées
--   -   2 source='manual' claim_status='approved' → CONSERVÉES (exception)
--   -   2 source='manual' plan='rpps' claim_status='none' → masquées
--   -   1 source='test' → masquée
-- Impact réel post-migration : -106 fiches publiques (108 - 2 exceptions claim).

CREATE OR REPLACE VIEW public.v_centres_auditifs_public AS
SELECT *
FROM public.centres_auditifs
WHERE
  -- Cesse SIRENE (sauf claim approved historique : Sonor Antony, Idéal Audition Aubervilliers)
  (etat_administratif IS DISTINCT FROM 'C' OR claim_status = 'approved')
  -- ET au moins un identifiant officiel verifiable (sauf claim approved historique)
  AND (
    (rpps IS NOT NULL AND rpps <> '')
    OR (siret IS NOT NULL AND siret <> '')
    OR claim_status = 'approved'
  );

COMMENT ON VIEW public.v_centres_auditifs_public IS
  'Vue publique stricte (mig 037) : exclut les fiches cessees (etat=C, sauf claim approved) ET les fiches sans identifiant officiel verifiable (rpps OU siret), avec exception pour claim approved historique. Garantit que toute fiche affichee publiquement est soit tracable cote Annuaire Sante (RPPS) ou INSEE SIRENE (SIRET), soit deja validee humainement (claim approved).';
