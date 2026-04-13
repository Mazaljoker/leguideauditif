import { emailLayout } from './layout';

interface ClaimAdminData {
  prenom: string;
  nom: string;
  email: string;
  adeli: string;
  centreNom: string;
  centreSlug: string;
  tel?: string;
  approveUrl: string;
  rejectUrl: string;
}

export function claimAdminNotificationEmail({ prenom, nom, email, adeli, centreNom, centreSlug, tel, approveUrl, rejectUrl }: ClaimAdminData): string {
  return emailLayout(
    'Nouvelle revendication de centre',
    `
    <h2>Nouvelle demande de revendication</h2>
    <div class="info-box">
      <p><strong>Centre :</strong> ${centreNom}</p>
      <p><strong>Demandeur :</strong> ${prenom} ${nom}</p>
      <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>ADELI / SIRET :</strong> ${adeli}</p>
      ${tel ? `<p><strong>T\u00e9l :</strong> ${tel}</p>` : ''}
    </div>
    <p>V\u00e9rifiez le num\u00e9ro ADELI/SIRET puis cliquez sur un bouton :</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${approveUrl}" class="btn" style="margin-right:12px;">Approuver</a>
      <a href="${rejectUrl}" class="btn" style="background-color:#A32D2D;">Rejeter</a>
    </div>
    <p style="font-size:13px;color:#6B7B8D;">Ces liens sont s\u00e9curis\u00e9s par un token HMAC. Ils fonctionnent sans connexion.</p>
    <a href="https://leguideauditif.fr/centre/${centreSlug}/" style="font-size:14px;color:#D97B3D;">Voir la fiche</a>
    `
  );
}
