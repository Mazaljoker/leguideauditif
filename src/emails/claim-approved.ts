import { emailLayout } from './layout';

interface ClaimApprovedData {
  prenom: string;
  centreNom: string;
  centreSlug: string;
}

export function claimApprovedEmail({ prenom, centreNom, centreSlug }: ClaimApprovedData): string {
  return emailLayout(
    'Votre fiche est valid\u00e9e',
    `
    <p>Bonjour ${prenom},</p>
    <p>Bonne nouvelle ! Apr\u00e8s v\u00e9rification de vos informations professionnelles, votre fiche a \u00e9t\u00e9 <strong>valid\u00e9e</strong> :</p>
    <div class="info-box">
      <strong>${centreNom}</strong>
    </div>
    <h2>Ce que vous pouvez faire maintenant</h2>
    <ul>
      <li>Compl\u00e9ter votre fiche : horaires, sp\u00e9cialit\u00e9s, photo du centre</li>
      <li>Recevoir directement les demandes de devis de votre secteur</li>
      <li>Suivre les statistiques de visibilit\u00e9 de votre fiche</li>
    </ul>
    <a href="https://leguideauditif.fr/connexion/" class="btn">Acc\u00e9der \u00e0 mon espace</a>
    <h2>Boostez votre visibilit\u00e9</h2>
    <p>Avec la formule <strong>Premium</strong>, votre centre appara\u00eet en priorit\u00e9 dans les r\u00e9sultats de recherche de votre zone et vous recevez les demandes de devis en exclusivit\u00e9.</p>
    <a href="https://leguideauditif.fr/centre/${centreSlug}/" class="btn" style="background-color: #1B2E4A;">D\u00e9couvrir la formule Premium</a>
    <p>Si vous avez des questions, r\u00e9pondez directement \u00e0 cet email.</p>
    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioproth\u00e9siste DE &mdash; LeGuideAuditif.fr</p>
    `
  );
}
