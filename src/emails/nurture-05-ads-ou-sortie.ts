import { emailLayout } from './layout';
import { CALENDLY_URL } from './constants';

interface Nurture05Data {
  prenom: string;
  unsubscribeToken: string;
}

/**
 * Template nurture #5 — Phase 2.
 * Trigger : 45 jours après passage `approuve` ET stage ≠ `premium`.
 *
 * Dernière relance avant retrait du drip. Deux options explicites,
 * pas de fausse urgence. CTA principal Option A = bouton Calendly RDV
 * 20 minutes (le sujet Ads se traite en 1:1 — pricing zone-dépendant).
 *
 * Choix éditorial Franck : pas de tarif Ads chiffré dans le mail. Le
 * pricing dépend de la zone, du budget cible et du périmètre — c'est
 * forcément du devis personnalisé. Les chiffres (anciens "300 € setup
 * + 20 %") sont retirés au profit d'un "sur devis" qui force le 1:1.
 */
export function nurture05AdsOuSortieEmail(data: Nurture05Data): string {
  const { prenom, unsubscribeToken } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Des RDV patients ou vous restez en vitrine ?',
    `
    <p>${greeting}</p>

    <p>Ça fait 45 jours que votre fiche est validée sur LeGuideAuditif. Deux scénarios.</p>

    <h2>Option A — Vous voulez des RDV patients concrets</h2>
    <p>On peut lancer des <strong>campagnes Google Ads ciblées</strong> sur votre zone géographique. Vous payez Google directement, je gère la partie technique, le tracking des leads et le suivi mensuel.</p>
    <p>Le pricing dépend de votre zone, du budget cible et du périmètre — c'est du <strong>sur devis</strong>, on en discute au cas par cas pour être réalistes sur ce qu'on peut viser ensemble.</p>

    <p><a href="${CALENDLY_URL}" class="btn">Réserver 20 minutes avec moi</a></p>

    <h2>Option B — Vous préférez rester en fiche gratuite</h2>
    <p>Aucun souci. Votre fiche reste référencée, vous continuez à recevoir les demandes spontanées. Je ne vous relance plus sur ce sujet. Si vous voulez juste me prévenir, une ligne en réponse à ce mail suffit (« je reste gratuit »).</p>

    <p style="margin-top:24px;">Vous pouvez aussi <a href="https://leguideauditif.fr/audioprothesiste-pro/">accéder à votre espace pro</a> à tout moment pour mettre à jour votre fiche.</p>

    <p style="margin-top: 24px;">Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
    { unsubscribeToken },
  );
}
