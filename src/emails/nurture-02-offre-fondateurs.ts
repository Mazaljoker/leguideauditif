import { emailLayout } from './layout';

interface Nurture02Data {
  prenom: string;
  slotsRestants: number;   // 0..20
  unsubscribeToken: string;
}

/**
 * Template nurture #2 — Phase 2.
 * Trigger : stage `approuve`/`active`/`engage` depuis ≥ 7j ET
 * feature_flag `fondateurs_drip_enabled` = true.
 * Skip si `slotsRestants = 0`.
 *
 * Offre réelle : 19€/mois à vie + 3 mois gratuits, pas d'engagement.
 * Avantages énumérés = ce qui existe déjà côté produit (pas de vaporware).
 * Ton confraternel — merci aux premiers, pas de CTA commercial pressant.
 */
export function nurture02OffreFondateursEmail(data: Nurture02Data): string {
  const { prenom, slotsRestants, unsubscribeToken } = data;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';
  const placesLabel = slotsRestants > 1 ? `${slotsRestants} places` : '1 place';

  return emailLayout(
    `Programme Partenaires Fondateurs — ${placesLabel} restante${slotsRestants > 1 ? 's' : ''}`,
    `
    <p>${greeting}</p>

    <p>D'abord merci. Vous avez rejoint LeGuideAuditif alors que le site sortait à peine, sans savoir si ça valait la peine. C'est ce qui permet au projet d'exister aujourd'hui — littéralement.</p>

    <p>Je voulais vous parler du programme Partenaires Fondateurs.</p>

    <h2>L'offre</h2>
    <ul>
      <li>Premium à <strong>19&nbsp;€&nbsp;/&nbsp;mois à vie</strong> — tarif gelé tant que l'abonnement reste actif</li>
      <li><strong>3 mois gratuits</strong> au démarrage, le temps de voir si ça vous sert</li>
      <li>Pas d'engagement : vous résiliez quand vous voulez</li>
    </ul>

    <h2>Ce que ça change sur votre fiche — concrètement</h2>
    <ul>
      <li>Le badge <strong>Centre vérifié</strong> apparaît sur votre fiche publique (signal fort côté patient)</li>
      <li>Vous montez en <strong>tête des résultats de votre département</strong>, devant les fiches RPPS brutes des centres non revendiqués</li>
      <li>Vos horaires, photo et description restent modifiables quand vous voulez depuis l'espace pro (comme aujourd'hui)</li>
    </ul>

    <h2>Ce que je vous demande</h2>
    <p>Votre retour à froid, au bout de quelques semaines, sur ce qui vous sert et ce qui manque. C'est tout. Pas de témoignage obligatoire, pas de clause à signer.</p>

    <p><a href="https://leguideauditif.fr/audioprothesiste-pro/" class="btn">Accéder à mon espace pro</a></p>

    <p>Il reste <strong>${placesLabel}</strong> sur les 20 du programme. Si vous voulez en parler de vive voix, <strong>répondez simplement à ce mail</strong> et on cale 20 minutes quand vous voulez — visio ou téléphone, comme vous préférez.</p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — 28 ans en cabine<br/>
    LeGuideAuditif.fr</p>
    `,
    { unsubscribeToken },
  );
}
