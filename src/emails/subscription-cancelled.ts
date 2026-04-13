import { emailLayout } from './layout';

interface SubscriptionCancelledData {
  centreSlug: string;
}

export function subscriptionCancelledEmail({ centreSlug }: SubscriptionCancelledData): string {
  return emailLayout(
    'Abonnement Premium annulé',
    `
    <p>Bonjour,</p>
    <p>Votre abonnement Premium pour votre centre a été annulé. Votre fiche reste visible sur LeGuideAuditif.fr, mais les fonctionnalités Premium (mise en avant, statistiques avancées) sont désactivées.</p>
    <p>Vous pouvez réactiver votre abonnement à tout moment depuis votre fiche :</p>
    <a href="https://leguideauditif.fr/centres/${centreSlug}/" class="btn">Voir ma fiche</a>
    <p>Si cette annulation n'était pas souhaitée, répondez à cet email et nous vous aiderons.</p>
    <p>Cordialement,<br/>LeGuideAuditif.fr</p>
    `
  );
}
