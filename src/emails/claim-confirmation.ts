import { emailLayout } from './layout';

interface ClaimConfirmationData {
  prenom: string;
  nom: string;
  centreNom: string;
  centreSlug: string;
  /** Champs optionnels pour d\u00e9tecter ce qui manque */
  siteWeb?: string | null;
  tel?: string | null;
  horaires?: string | null;
  specialites?: string[];
  marques?: string[];
  photo?: boolean;
  aPropos?: string | null;
}

export function claimConfirmationEmail(data: ClaimConfirmationData): string {
  const { prenom, nom, centreNom, centreSlug } = data;

  // Champs manquants
  const missing: string[] = [];
  if (!data.siteWeb) missing.push('Site web');
  if (!data.tel) missing.push('T\u00e9l\u00e9phone');
  if (!data.horaires) missing.push('Horaires d\u2019ouverture');
  if (!data.specialites || data.specialites.length === 0) missing.push('Sp\u00e9cialit\u00e9s');
  if (!data.marques || data.marques.length === 0) missing.push('Marques propos\u00e9es');
  if (!data.photo) missing.push('Photo du centre');
  if (!data.aPropos) missing.push('Description / \u00c0 propos');

  const missingBlock = missing.length > 0
    ? `
    <h2>Compl\u00e9tez votre fiche</h2>
    <p>Pour maximiser votre visibilit\u00e9 aupr\u00e8s des patients, nous vous recommandons de renseigner :</p>
    <ul style="padding-left:20px;">
      ${missing.map(m => `<li style="margin-bottom:4px;">${m}</li>`).join('')}
    </ul>
    <p>Une fiche compl\u00e8te re\u00e7oit en moyenne <strong>3 fois plus de demandes de contact</strong>. D\u00e8s validation, vous pourrez modifier votre fiche depuis votre espace.</p>
    `
    : `
    <div class="info-box">
      <strong>Bravo !</strong> Votre fiche est compl\u00e8te. Les fiches bien renseign\u00e9es re\u00e7oivent en moyenne 3 fois plus de demandes de contact.
    </div>
    `;

  return emailLayout(
    'Demande de revendication re\u00e7ue',
    `
    <p>Bonjour ${prenom} ${nom},</p>
    <p>Nous avons bien re\u00e7u votre demande de revendication pour le centre :</p>
    <div class="info-box">
      <strong>${centreNom}</strong>
    </div>
    <p>Notre \u00e9quipe va v\u00e9rifier votre num\u00e9ro ADELI et vos informations professionnelles. Vous recevrez un email de confirmation une fois la v\u00e9rification effectu\u00e9e.</p>
    <p><strong>D\u00e9lai habituel :</strong> 24 \u00e0 48 heures ouvr\u00e9es.</p>
    <a href="https://leguideauditif.fr/centre/${centreSlug}/" class="btn">Voir la fiche du centre</a>
    ${missingBlock}
    <h2 class="text-orange">Passez en Premium</h2>
    <div class="info-box info-box-marine">
      <p style="margin:0 0 8px 0;">Avec une <strong>fiche Premium</strong>, votre centre b\u00e9n\u00e9ficie de :</p>
      <ul style="padding-left:20px;margin:0;">
        <li>Affichage prioritaire dans les r\u00e9sultats de recherche</li>
        <li>Demandes de devis en exclusivit\u00e9</li>
        <li>Badge &laquo; Centre v\u00e9rifi\u00e9 &raquo; sur votre fiche</li>
        <li>Statistiques de consultation de votre fiche</li>
      </ul>
      <p style="margin:12px 0 0 0;">R\u00e9pondez \u00e0 cet email pour en savoir plus, ou d\u00e9couvrez nos formules :</p>
    </div>
    <a href="https://leguideauditif.fr/offres/" class="btn btn-marine">D\u00e9couvrir les formules Premium</a>
    <p>Si vous avez des questions, r\u00e9pondez directement \u00e0 cet email.</p>
    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioproth\u00e9siste DE &mdash; LeGuideAuditif.fr</p>
    `
  );
}
