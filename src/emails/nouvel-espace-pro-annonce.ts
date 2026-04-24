import { emailLayout } from './layout';

interface NouvelEspaceProAnnonceData {
  prenom: string;
}

/**
 * Template d'annonce "nouvel espace pro" — one-shot (pas dans la séquence
 * nurture automatique du PRD §7). Adressé aux audios déjà inscrits
 * (stage approuve/active/engage/premium, non désabonnés) pour les
 * ramener sur l'espace pro refondu.
 *
 * Ton pair à pair — on les remercie d'avoir rejoint tôt, on présente
 * les fonctionnalités qui existent réellement aujourd'hui (pas de
 * vaporware), CTA clair vers /audioprothesiste-pro/.
 */
export function nouvelEspaceProAnnonceEmail(data: NouvelEspaceProAnnonceData): string {
  const { prenom } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Votre espace pro LeGuideAuditif a été refondu',
    `
    <p>${greeting}</p>

    <p>Vous avez revendiqué votre fiche sur LeGuideAuditif ces derniers jours — une semaine au maximum pour la plupart d'entre vous. J'ai pris le temps de contacter chacun individuellement. Ceux qui ont pu me répondre m'ont fait des retours précieux sur ce qui manque et sur ce qui serait utile au quotidien.</p>

    <p>L'espace pro que je vous présente aujourd'hui est le résultat direct de ces échanges.</p>

    <h2>Ce que vous pouvez faire maintenant depuis votre espace</h2>
    <ul>
      <li><strong>Toutes vos fiches centralisées</strong> : si vous gérez plusieurs centres, vous les voyez d'un coup d'œil avec leur taux de complétude</li>
      <li><strong>Modifier horaires, photo, description en direct</strong> — les changements sont visibles côté patient dans la minute</li>
      <li><strong>Ajouter vos spécialités et marques</strong> d'appareillage pour que les patients sachent ce que vous faites vraiment</li>
      <li><strong>Suivre les demandes de contact patient</strong> qui arrivent via votre fiche (lus / non-lus, dates)</li>
      <li><strong>Voir vos sources de trafic</strong> (d'où viennent les patients qui consultent votre fiche)</li>
    </ul>

    <p>Trois minutes suffisent pour faire un tour et repérer ce qui manque. Si vous avez eu la patience de revendiquer votre fiche au début, vous avez déjà franchi le pas le plus difficile.</p>

    <p><a href="https://leguideauditif.fr/audioprothesiste-pro/" class="btn">Accéder à mon espace pro</a></p>

    <p>La connexion se fait via un lien magique envoyé à votre adresse — pas de mot de passe à retenir. Si vous avez un souci pour y accéder, répondez directement à ce mail.</p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
  );
}
