import { emailLayout } from './layout';

interface Nurture04Data {
  prenom: string;
  slotsRestants: number;   // typiquement 1..5 (sinon le cron skip ce template)
  calendarUrl: string;
}

/**
 * Template nurture #4 — Phase 2.
 * Trigger : 21 jours après passage `approuve` ET slotsRestants ≤ 5.
 * Rappel court, factuel. Ne part qu'à ceux qui n'ont pas encore candidaté.
 */
export function nurture04SlotsRestantsEmail(data: Nurture04Data): string {
  const { prenom, slotsRestants, calendarUrl } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const plural = slotsRestants > 1;
  const placesLabel = plural ? `${slotsRestants} places` : '1 place';

  return emailLayout(
    `Plus que ${placesLabel} Fondateurs`,
    `
    <p>${greeting}</p>

    <p>Message court : il reste <strong>${placesLabel}</strong> sur les 20 du programme Fondateurs. Dès que ça passe à zéro, on ferme cette offre et le Premium bascule sur le tarif standard.</p>

    <h2>Les 3 bénéfices essentiels</h2>
    <ul>
      <li>Premium à vie, sans abonnement récurrent</li>
      <li>Affichage prioritaire dans votre département</li>
      <li>Accès privilégié aux fonctionnalités à venir (tracking leads, campagnes Ads)</li>
    </ul>

    <p>Si vous hésitez encore, 20 minutes en visio pour trancher.</p>

    <p><a href="${calendarUrl}" class="btn">Candidater en 5 min</a></p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    LeGuideAuditif.fr</p>
    `,
  );
}
