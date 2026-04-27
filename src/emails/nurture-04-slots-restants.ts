import { emailLayout } from './layout';

interface Nurture04Data {
  prenom: string;
  slotsRestants: number;   // typiquement 1..5 (sinon le cron skip ce template)
  unsubscribeToken: string;
}

/**
 * Template nurture #4 — Phase 2.
 * Trigger : 21 jours après passage `approuve` ET slotsRestants ≤ 5.
 * Rappel court, factuel. Aligné avec nurture_02 v4 (offre réelle :
 * 19 €/mois à vie + 3 mois gratuits, pas de Cal.com, pas de vaporware).
 */
export function nurture04SlotsRestantsEmail(data: Nurture04Data): string {
  const { prenom, slotsRestants, unsubscribeToken } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const plural = slotsRestants > 1;
  const placesLabel = plural ? `${slotsRestants} places` : '1 place';

  return emailLayout(
    `Plus que ${placesLabel} Fondateurs`,
    `
    <p>${greeting}</p>

    <p>Message court : il reste <strong>${placesLabel}</strong> sur les 20 du programme Fondateurs. Une fois la liste pleine, l'offre se ferme.</p>

    <h2>Rappel</h2>
    <ul>
      <li>Premium à <strong>19&nbsp;€&nbsp;/&nbsp;mois à vie</strong>, tarif gelé tant que l'abonnement reste actif</li>
      <li><strong>3 mois gratuits</strong> au démarrage</li>
      <li>Pas d'engagement : vous résiliez quand vous voulez</li>
    </ul>

    <p>Si vous voulez en parler, <strong>répondez à ce mail</strong> et on cale 20 minutes — visio ou téléphone.</p>

    <p><a href="https://leguideauditif.fr/audioprothesiste-pro/" class="btn">Accéder à mon espace pro</a></p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    LeGuideAuditif.fr</p>
    `,
    { unsubscribeToken },
  );
}
