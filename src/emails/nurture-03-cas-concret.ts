import { emailLayout } from './layout';

interface Nurture03Data {
  prenom: string;
  /**
   * URL de l'article blog LeGuideAuditif qui développe l'étude de cas.
   * À produire + valider par Franck-Olivier avant activation Phase 2
   * (rôle du skill me-affiliate-writer + gate me-eeat-compliance).
   */
  articleUrl: string;
}

/**
 * Template nurture #3 — Phase 2.
 * Trigger : 14 jours après passage `approuve` OU entrée `engage`.
 * Angle preuve sociale terrain, pas de chiffres garantis
 * (§10.2 PRD : qualitatif, pas de leads promis).
 */
export function nurture03CasConcretEmail(data: Nurture03Data): string {
  const { prenom, articleUrl } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Comment un pair a structuré sa présence',
    `
    <p>${greeting}</p>

    <p>Un audio qui a rejoint LeGuideAuditif dans les premiers jours vient de passer 6 mois sur la plateforme. Je voulais partager ce qu'il a mis en place — pas pour vanter le site, mais parce que sa méthode est transposable.</p>

    <p><strong>Contexte</strong> : 3 centres indépendants, aucune présence en ligne structurée avant LGA, patientèle locale mature.</p>

    <h2>Ce qu'il a fait en priorité</h2>
    <ol>
      <li><strong>Une photo par centre</strong>, pas une photo générique. Cabine réelle, lumière naturelle. Zéro frais de photographe.</li>
      <li><strong>Des horaires différents pour chaque centre</strong>, avec les vraies coupures méridiennes. Les patients détestent découvrir un "fermé" sur place.</li>
      <li><strong>Une description de 3-4 phrases par fiche</strong>. Pas un copier-coller : chaque équipe a sa spécificité (appareillage enfant sur un centre, implantologie sur l'autre, pédiatrie sur le troisième).</li>
    </ol>

    <h2>Ce qui a changé concrètement</h2>
    <ul>
      <li>Plus de questions techniques posées en premier RDV — les patients arrivent en ayant lu les spécialités</li>
      <li>Moins de patients qui débarquent en pensant que son centre fait des tests auditifs gratuits sans appareillage</li>
      <li>Moins de friction au premier contact, plus de temps utile en cabine</li>
    </ul>

    <p>Rien de magique. Juste des basiques bien faits.</p>

    <p><a href="${articleUrl}" class="btn">Lire l'étude de cas complète</a></p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — LeGuideAuditif.fr</p>
    `,
  );
}
