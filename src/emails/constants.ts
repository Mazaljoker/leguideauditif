/**
 * Constantes éditoriales partagées entre templates email.
 *
 * Centralisation pour qu'un changement de calendrier (ex: migration
 * Calendly → Cal.com plus tard) ne demande qu'un seul edit.
 */

/**
 * Lien Calendly canonique pour réserver 20 minutes avec Franck-Olivier.
 * Utilisé dans les nurtures 02/03/04/05 (offre Fondateurs, méthode,
 * slots restants, ads vs sortie).
 *
 * Si tu changes l'URL (nouvelle page Calendly, nouveau type d'évènement),
 * mets à jour ici uniquement — tous les templates suivront.
 */
export const CALENDLY_URL =
  'https://calendly.com/franckolivier-leguideauditif/presentation-le-guide-auditif-pro';
