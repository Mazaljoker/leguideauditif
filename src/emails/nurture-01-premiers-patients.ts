import { emailLayout } from './layout';

interface Nurture01Data {
  prenom: string;
  nbCentres: number;
  completenessAvg: number;        // 0..100 — moyenne des centres de l'audio
  primaryCentreSlug: string;      // centre le moins complet (pour l'ancrage)
  unsubscribeToken: string;       // audiopro_lifecycle.email_preferences_token
}

/**
 * Template nurture #1 — Phase 2.
 * Trigger : stage `approuve` depuis ≥ 3 jours, pas encore envoyé.
 * Angle confraternel, pédagogique. Aucune vente, juste des repères.
 */
export function nurture01PremiersPatientsEmail(data: Nurture01Data): string {
  const { prenom, nbCentres, completenessAvg, primaryCentreSlug, unsubscribeToken } = data;
  const editUrl = `https://leguideauditif.fr/audioprothesiste-pro/fiche?centre=${primaryCentreSlug}`;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  const fichesLabel = nbCentres > 1 ? `Vos ${nbCentres} fiches sont` : 'Votre fiche est';
  const ctaLabel = nbCentres > 1 ? 'Compléter mes fiches' : 'Compléter ma fiche';

  return emailLayout(
    'Vos premiers patients sur LeGuideAuditif',
    `
    <p>${greeting}</p>

    <p>Votre fiche est validée et visible sur LeGuideAuditif depuis quelques jours. Quelques repères pour bien démarrer.</p>

    <p>Les patients vous trouvent par deux chemins : la <strong>carte du département</strong> et la <strong>recherche par ville</strong>. Dans les deux cas, ce qui déclenche le clic ce n'est pas le premier nom affiché, c'est celui qui a une photo de cabine, des horaires précis et quelques mots qui décrivent à qui on a affaire.</p>

    <div class="info-box">
      <p style="margin:0;"><strong>${fichesLabel} à ${completenessAvg}% de complétude aujourd'hui.</strong></p>
      <p style="margin:4px 0 0;" class="text-muted">Quelques champs en plus, et la fiche commence à parler aux patients.</p>
    </div>

    <p>Pas d'urgence, juste quelques minutes quand vous aurez un moment.</p>

    <p><a href="${editUrl}" class="btn">${ctaLabel}</a></p>

    <p>Si vous avez une question sur la fiche ou sur le fonctionnement du site en général, répondez directement à ce mail.</p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — LeGuideAuditif.fr</p>
    `,
    { unsubscribeToken },
  );
}
