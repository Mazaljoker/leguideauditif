import { emailLayout } from './layout';

const PRODUCT_LABELS: Record<string, string> = {
  unlock_contacts: 'Déblocage des contacts',
  premium: 'Annonce Premium',
  boost_semaine: 'Boost 7 jours',
  alerte_ciblee: 'Alerte ciblée',
  pack_cession: 'Pack Cession',
  pack_cession_accomp: 'Pack Cession Accompagné',
};

interface PaymentAdminData {
  produit: string;
  montant: number;
  annonceId: string;
  userId: string;
  requiresAction: boolean;
}

export function paymentAdminNotificationEmail({ produit, montant, annonceId, userId, requiresAction }: PaymentAdminData): string {
  const label = PRODUCT_LABELS[produit] || produit;
  const montantFormatted = (montant / 100).toFixed(2).replace('.', ',');

  return emailLayout(
    `Paiement reçu — ${label}`,
    `
    <h2>Nouveau paiement annonce</h2>
    <div class="info-box">
      <p><strong>Produit :</strong> ${label}</p>
      <p><strong>Montant :</strong> ${montantFormatted} &euro;</p>
      <p><strong>Annonce :</strong> ${annonceId}</p>
      <p><strong>User ID :</strong> ${userId}</p>
    </div>
    ${requiresAction ? '<p style="color: #D97B3D; font-weight: bold;">Action manuelle requise — Pack Cession Accompagné : contacter le client sous 24h.</p>' : ''}
    `
  );
}
