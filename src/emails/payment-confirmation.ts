import { emailLayout } from './layout';

const PRODUCT_LABELS: Record<string, string> = {
  unlock_contacts: 'Déblocage des contacts',
  premium: 'Annonce Premium',
  boost_semaine: 'Boost 7 jours',
  alerte_ciblee: 'Alerte ciblée',
  pack_cession: 'Pack Cession',
  pack_cession_accomp: 'Pack Cession Accompagné',
};

interface PaymentConfirmationData {
  email: string;
  produit: string;
  montant: number;
  annonceId: string;
}

export function paymentConfirmationEmail({ email, produit, montant, annonceId }: PaymentConfirmationData): string {
  const label = PRODUCT_LABELS[produit] || produit;
  const montantFormatted = (montant / 100).toFixed(2).replace('.', ',');

  return emailLayout(
    `Confirmation de paiement — ${label}`,
    `
    <p>Bonjour,</p>
    <p>Votre paiement a bien été reçu. Voici le récapitulatif :</p>
    <div class="info-box">
      <p><strong>Produit :</strong> ${label}</p>
      <p><strong>Montant :</strong> ${montantFormatted} &euro;</p>
      <p><strong>Annonce :</strong> #${annonceId.slice(0, 8)}</p>
    </div>
    ${produit === 'pack_cession_accomp' ? '<p><strong>Note :</strong> Un accompagnement personnalisé est inclus. Franck-Olivier vous contactera sous 24h pour organiser le suivi.</p>' : ''}
    ${produit === 'boost_semaine' ? '<p>Votre annonce sera mise en avant pendant 7 jours à compter de maintenant.</p>' : ''}
    ${produit === 'alerte_ciblee' ? '<p>Votre alerte est activée. Vous recevrez un email dès qu\'une annonce correspondant à vos critères sera publiée.</p>' : ''}
    <a href="https://leguideauditif.fr/annonces/" class="btn">Voir mes annonces</a>
    <p>Cordialement,<br/>LeGuideAuditif.fr</p>
    `
  );
}
