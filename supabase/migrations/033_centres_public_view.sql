-- 033_centres_public_view.sql
-- Vue publique des centres : exclut les fiches dont l'entité juridique est cessée
-- (etat_administratif='C' SIRENE). Toutes les requêtes côté front public DOIVENT
-- utiliser cette vue. Les requêtes admin/CRM continuent de lire centres_auditifs
-- directement pour pouvoir investiguer les cas problématiques.
--
-- Contexte : signal terrain Aurélie Azam (Carcassonne) du 27 avril 2026 — fiches
-- UNION MUTUALITE FRANCAISE AUDE (cessées) affichées en public.
-- Volume au 2026-04-27 : 283 fiches en état C (3,01% du parc).
--
-- Exception : fiches avec claim_status='approved' (audioprothésiste revendicateur
-- déjà validé manuellement par l'admin). Cas concrets : Sonor Antony, Idéal
-- Audition Aubervilliers — la sync RPPS bi-mensuelle (sprint B) corrigera l'état
-- administratif quand l'INSEE poussera la nouvelle entité.

CREATE OR REPLACE VIEW public.v_centres_auditifs_public AS
SELECT *
FROM public.centres_auditifs
WHERE etat_administratif IS DISTINCT FROM 'C'
   OR claim_status = 'approved';

COMMENT ON VIEW public.v_centres_auditifs_public IS
  'Vue publique : exclut les fiches d''établissements cessés (etat_administratif=C) SAUF si claim_status=approved (exception : audio revendicateur déjà validé). À utiliser dans toutes les requêtes côté front public. Les requêtes admin doivent rester sur la table centres_auditifs.';

-- Note : IS DISTINCT FROM 'C' couvre aussi les NULL (NULL IS DISTINCT FROM 'C' = TRUE).
-- Sémantique équivalente à : (etat_administratif != 'C' OR etat_administratif IS NULL).
