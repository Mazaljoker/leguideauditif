import { emailLayout } from './layout';

interface Nurture05Data {
  prenom: string;
  calendarUrl: string;   // lien Cal.com / Zoom pour l'option Ads
  stayFreeUrl: string;   // lien/form léger pour "je reste en gratuit"
}

/**
 * Template nurture #5 — Phase 2.
 * Trigger : 45 jours après passage `approuve` ET stage ≠ `premium`.
 * Angle direct, honnête, deux options explicites — dernière carte
 * avant de laisser l'audio tranquille.
 */
export function nurture05AdsOuSortieEmail(data: Nurture05Data): string {
  const { prenom, calendarUrl, stayFreeUrl } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Des RDV patients ou vous restez en vitrine ?',
    `
    <p>${greeting}</p>

    <p>Ça fait 45 jours que votre fiche est validée sur LeGuideAuditif. Deux scénarios possibles.</p>

    <h2>Option A — Vous voulez des RDV patients concrets</h2>
    <p>On peut lancer des <strong>campagnes Google Ads ciblées</strong> sur votre zone géographique (rayon de votre centre). Setup 300&nbsp;€ une fois, puis 20&nbsp;% du budget pub que vous choisissez. Vous payez Google directement, je gère la partie technique, le tracking des leads et le suivi mensuel.</p>
    <p>Le volume dépend fortement de la zone et du budget — on en discute au cas par cas pour être réalistes sur ce qu'on peut viser ensemble.</p>

    <h2>Option B — Vous préférez rester en fiche gratuite</h2>
    <p>Aucun souci. Votre fiche reste référencée, vous continuez à recevoir les demandes spontanées. Je ne vous relance plus sur ce sujet.</p>

    <p style="margin-top: 24px;">Pour me dire de quel côté vous êtes :</p>

    <p>
      <a href="${calendarUrl}" class="btn">Discuter d'une campagne Ads</a>
    </p>
    <p>
      <a href="${stayFreeUrl}" style="color:#1B2E4A;text-decoration:underline;">Je reste en fiche gratuite</a>
    </p>

    <p style="margin-top: 24px;">Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
  );
}
