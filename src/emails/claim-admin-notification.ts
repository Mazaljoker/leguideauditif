import { emailLayout } from './layout';

interface ClaimAdminData {
  prenom: string;
  nom: string;
  email: string;
  adeli: string;
  centreNom: string;
  centreSlug: string;
  tel?: string;
}

export function claimAdminNotificationEmail({ prenom, nom, email, adeli, centreNom, centreSlug, tel }: ClaimAdminData): string {
  return emailLayout(
    'Nouvelle revendication de centre',
    `
    <h2>Nouvelle demande de revendication</h2>
    <div class="info-box">
      <p><strong>Centre :</strong> ${centreNom} (<code>${centreSlug}</code>)</p>
      <p><strong>Demandeur :</strong> ${prenom} ${nom}</p>
      <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
      <p><strong>ADELI :</strong> ${adeli}</p>
      ${tel ? `<p><strong>Tél :</strong> ${tel}</p>` : ''}
    </div>
    <p>Action requise : vérifier le numéro ADELI et valider ou rejeter la demande.</p>
    <a href="https://leguideauditif.fr/centre/${centreSlug}/" class="btn">Voir la fiche</a>
    `
  );
}
