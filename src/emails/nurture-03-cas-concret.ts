import { emailLayout } from './layout';

interface Nurture03Data {
  prenom: string;
  /**
   * URL de l'article blog LeGuideAuditif qui développe la méthode complète.
   * À produire et valider via la chaîne GAN avant activation Phase 2.
   */
  articleUrl: string;
}

/**
 * Template nurture #3 — Phase 2.
 * Trigger : 14 jours après passage `approuve` OU entrée `engage`.
 *
 * Angle : pas un faux cas client, mais la méthode que Franck-Olivier
 * recommande à partir de son expérience cabine. Plus durable et plus
 * honnête qu'un "j'ai un audio qui..." inventé.
 */
export function nurture03CasConcretEmail(data: Nurture03Data): string {
  const { prenom, articleUrl } = data;
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

    <p><a href="${articleUrl}" class="btn">Lire la méthode complète</a></p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
  );
}
