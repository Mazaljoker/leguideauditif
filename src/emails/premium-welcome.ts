import { emailLayout } from './layout';

interface PremiumWelcomeData {
  prenom: string;
  centreNom: string;
  centreSlug: string;
}

/**
 * Email déclenché par le webhook Stripe sur `checkout.session.completed`
 * (bloc CENTRES) quand un audio passe en premium.
 *
 * NOTE : contenu placeholder structurel. Le copy final doit être généré via
 * le skill nposts-social-humanizer avant mise en production Phase 2. Le bloc
 * entre <!-- BEGIN COPY --> et <!-- END COPY --> est à humaniser.
 */
export function premiumWelcomeEmail(data: PremiumWelcomeData): string {
  const { prenom, centreNom, centreSlug } = data;
  const editUrl = `https://leguideauditif.fr/audioprothesiste-pro/fiche?centre=${centreSlug}`;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Bienvenue en Premium',
    `
    <!-- BEGIN COPY -->
    <p>${greeting}</p>

    <p>Merci de rejoindre LeGuideAuditif en Premium. Votre centre <strong>${centreNom}</strong> passe en visibilité prioritaire dès maintenant.</p>

    <h2>Ce qui change immédiatement</h2>
    <ul>
      <li>Badge « Centre vérifié » affiché sur votre fiche</li>
      <li>Affichage prioritaire dans les résultats de recherche de votre département</li>
      <li>Demandes de devis patient en exclusivité sur votre zone</li>
      <li>Accès aux statistiques de consultation de votre fiche</li>
    </ul>

    <h2>Pour démarrer</h2>
    <p>Pour tirer parti au maximum de votre fiche Premium dès cette semaine, complétez les derniers champs (photo, spécialités, marques) depuis votre espace pro.</p>

    <p><a href="${editUrl}" class="btn">Accéder à mon espace pro</a></p>

    <p>Si vous avez besoin d'un coup de main pour paramétrer votre fiche ou lancer votre première campagne d'acquisition, répondez simplement à ce mail.</p>

    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioprothésiste DE — LeGuideAuditif.fr</p>
    <!-- END COPY -->
    `,
  );
}
