import { emailLayout } from './layout';
import { CALENDLY_URL } from './constants';

interface Nurture03Data {
  prenom: string;
  unsubscribeToken: string;
}

/**
 * Template nurture #3 — Phase 2.
 * Trigger : 14 jours après passage `approuve` OU entrée `engage`.
 *
 * Angle : pas un faux cas client, mais la méthode que Franck-Olivier
 * recommande à partir de son expérience cabine. Plus durable et plus
 * honnête qu'un "j'ai un audio qui..." inventé.
 *
 * CTA : RDV 20 minutes Calendly (cf. CALENDLY_URL). L'angle "méthode"
 * justifie un échange direct plutôt qu'un article — l'expertise se
 * transmet mieux en 20 min de visio que par lecture passive.
 */
export function nurture03CasConcretEmail(data: Nurture03Data): string {
  const { prenom, unsubscribeToken } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Trois choses qui changent la perception côté patient',
    `
    <p>${greeting}</p>

    <p>Je vois passer beaucoup de fiches sur LeGuideAuditif. Celles qui convertissent les patients en RDV ont presque toujours les trois mêmes basiques en place. Pas de magie, juste de la cohérence.</p>

    <h2>1. Une vraie photo, pas une image de banque</h2>
    <p>Une photo de votre cabine, prise au téléphone, en lumière naturelle, ça vaut mieux qu'un visuel propre mais générique. Le patient cherche un humain, pas un cabinet médical anonyme. Si vous avez une équipe, un cliché en blouse devant la machine de mesure fonctionne très bien.</p>

    <h2>2. Des horaires sincères, coupures méridiennes incluses</h2>
    <p>Si vous fermez de 12h à 14h, écrivez-le. Si l'agenda du lundi est différent du mardi, mettez-les distincts. Les patients détestent découvrir un "fermé" sur place après s'être déplacés. Une fiche avec des horaires détaillés génère plus de confiance qu'une fiche avec "9h-19h" écrasé sur tous les jours.</p>

    <h2>3. Une description qui dit ce que vous faites vraiment</h2>
    <p>Trois ou quatre phrases. Pas un copier-coller corporate. Si votre centre fait beaucoup d'appareillage senior à domicile, dites-le. Si vous avez une expertise tinnitus, mettez-le en avant. Si l'équipe parle plusieurs langues dans une zone touristique, c'est pertinent. Le patient qui lit votre description avant d'appeler arrive en consultation avec les bonnes attentes — et la première séance va plus vite.</p>

    <p>Ces trois points prennent vingt minutes à mettre à jour. Les retours patients qu'on observe ensuite sont qualitativement différents : moins de questions techniques en ouverture de RDV, moins de patients qui pensent qu'on fait des tests gratuits sans appareillage.</p>

    <p>Si vous voulez qu'on regarde votre fiche ensemble et qu'on cale les trois points en direct, le plus simple est d'en parler 20 minutes en visio.</p>

    <p><a href="${CALENDLY_URL}" class="btn">Réserver 20 minutes avec moi</a></p>

    <p>Sinon vous pouvez répondre à ce mail avec une question précise, je regarde directement.</p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
    { unsubscribeToken },
  );
}
