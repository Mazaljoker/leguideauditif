import { emailLayout } from './layout';

interface ClaimConfirmationData {
  prenom: string;
  nom: string;
  centreNom: string;
  centreSlug: string;
}

export function claimConfirmationEmail({ prenom, nom, centreNom, centreSlug }: ClaimConfirmationData): string {
  return emailLayout(
    'Demande de revendication reçue',
    `
    <p>Bonjour ${prenom} ${nom},</p>
    <p>Nous avons bien reçu votre demande de revendication pour le centre :</p>
    <div class="info-box">
      <strong>${centreNom}</strong>
    </div>
    <p>Notre équipe va vérifier votre numéro ADELI et vos informations professionnelles. Vous recevrez un email de confirmation une fois la vérification effectuée.</p>
    <p><strong>Délai habituel :</strong> 24 à 48 heures ouvrées.</p>
    <a href="https://leguideauditif.fr/centre/${centreSlug}/" class="btn">Voir la fiche du centre</a>
    <p>Si vous avez des questions, répondez directement à cet email.</p>
    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioprothésiste DE &mdash; LeGuideAuditif.fr</p>
    `
  );
}
