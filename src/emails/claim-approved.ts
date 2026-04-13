import { emailLayout } from './layout';

interface ClaimApprovedData {
  prenom: string;
  centreNom: string;
  centreSlug: string;
  magicLink?: string;
}

export function claimApprovedEmail({ prenom, centreNom, centreSlug, magicLink }: ClaimApprovedData): string {
  const editUrl = magicLink || `https://leguideauditif.fr/centre/${centreSlug}/`;
  const editLabel = magicLink ? 'Modifier ma fiche maintenant' : 'Voir ma fiche';

  return emailLayout(
    'Votre fiche est valid\u00e9e',
    `
    <p>Bonjour ${prenom},</p>
    <p>Bonne nouvelle ! Apr\u00e8s v\u00e9rification de vos informations professionnelles, votre fiche a \u00e9t\u00e9 <strong>valid\u00e9e</strong> :</p>
    <div class="info-box">
      <strong>${centreNom}</strong>
    </div>
    <h2>Compl\u00e9tez votre fiche</h2>
    <p>Cliquez sur le bouton ci-dessous pour acc\u00e9der directement \u00e0 votre espace et personnaliser votre fiche :</p>
    <a href="${editUrl}" class="btn">${editLabel}</a>
    <p style="font-size:13px;color:#6B7B8D;">Ce lien est valable 24h. Pour vous reconnecter plus tard, rendez-vous sur <a href="https://leguideauditif.fr/connexion-pro" style="color:#D97B3D;">leguideauditif.fr/connexion-pro</a> et saisissez votre email.</p>
    <h2>Boostez votre visibilit\u00e9</h2>
    <p>Avec la formule <strong>Premium</strong>, votre centre appara\u00eet en priorit\u00e9 dans les r\u00e9sultats de recherche et vous recevez les demandes de devis en exclusivit\u00e9.</p>
    <p>Pour en savoir plus, r\u00e9pondez directement \u00e0 cet email.</p>
    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioproth\u00e9siste DE &mdash; LeGuideAuditif.fr</p>
    `
  );
}
