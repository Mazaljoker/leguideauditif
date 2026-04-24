import { emailLayout } from './layout';

interface PremiumWelcomeData {
  prenom: string;
  centreNom: string;
  centreSlug: string;
}

/**
 * Template Phase 1 — déclenché uniquement par le webhook Stripe
 * (`checkout.session.completed`, bloc CENTRES) quand un audio bascule
 * en premium. Voix Franck-Olivier, pair à pair, 28 ans d'exercice.
 */
export function premiumWelcomeEmail(data: PremiumWelcomeData): string {
  const { prenom, centreNom, centreSlug } = data;
  const editUrl = `https://leguideauditif.fr/audioprothesiste-pro/fiche?centre=${centreSlug}`;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Bienvenue en Premium',
    `
    <p>${greeting}</p>

    <p>Merci de rejoindre LeGuideAuditif en Premium. Votre centre <strong>${centreNom}</strong> passe en visibilité prioritaire dès maintenant.</p>

    <h2>Ce qui change dans les prochaines heures</h2>
    <ul>
      <li>Le badge <strong>Centre vérifié</strong> apparaît sur votre fiche publique</li>
      <li>Vous remontez en tête des résultats de votre département</li>
      <li>Les demandes de devis patient sur votre zone vous sont envoyées en exclusivité, pas aux autres centres</li>
      <li>Vous avez accès aux statistiques de consultation de votre fiche</li>
    </ul>

    <h2>Pour bien démarrer cette semaine</h2>
    <p>Trois points prioritaires à vérifier :</p>
    <ul>
      <li><strong>Photo à jour</strong> — une vraie photo de cabine, pas une image de banque</li>
      <li><strong>Horaires précis</strong> — en particulier les coupures méridiennes, les patients détestent découvrir un "fermé" sur place</li>
      <li><strong>Description de 3-4 phrases</strong> — ce qui distingue votre centre : spécialités, équipe, clientèle</li>
    </ul>

    <p>Ça prend vingt minutes. Les premiers patients arrivent mieux préparés et la conversion en RDV monte franchement.</p>

    <p><a href="${editUrl}" class="btn">Accéder à mon espace pro</a></p>

    <p>Si vous avez une question sur le paramétrage de votre fiche, une idée de campagne Ads ou juste un doute sur le positionnement, répondez directement à ce mail. Je prends le temps de vous répondre.</p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
  );
}
