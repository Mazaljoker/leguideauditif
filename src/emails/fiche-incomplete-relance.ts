import { emailLayout } from './layout';
import {
  type AudioproMissingField,
  COMPLETENESS_FIELD_LABELS,
} from '../types/audiopro-lifecycle';

interface FicheIncompleteRelanceData {
  prenom: string;
  /**
   * Liste retournée par la fonction SQL `audiopro_missing_fields()`.
   * Ordre attendu : centre le moins complet en premier (cible magic link).
   */
  centres: AudioproMissingField[];
  unsubscribeToken: string;
}

/**
 * Seul template nurture fonctionnel en Phase 1 via
 * /api/admin/relance-email. Voix Franck-Olivier, pair à pair.
 */
export function ficheIncompleteRelanceEmail(data: FicheIncompleteRelanceData): string {
  const { prenom, centres, unsubscribeToken } = data;

  const incomplete = centres.filter(c => c.missing_fields.length > 0);
  const complete   = centres.filter(c => c.missing_fields.length === 0);

  // Garde-fou : l'endpoint caller refuse déjà l'envoi si incomplete.length === 0,
  // mais on blinde ici pour que le template ne crashe jamais côté build.
  const targetCentre = incomplete[0] ?? centres[0];
  const editUrl = targetCentre
    ? `https://leguideauditif.fr/audioprothesiste-pro/fiche?centre=${targetCentre.centre_slug}`
    : 'https://leguideauditif.fr/audioprothesiste-pro/fiche';

  const centresBlock = incomplete
    .map(c => {
      const missingLabels = c.missing_fields
        .map(f => COMPLETENESS_FIELD_LABELS[f])
        .join(', ');
      return `
        <div class="info-box">
          <p style="margin:0 0 4px 0;"><strong>${c.centre_nom}</strong> — ${c.completeness_pct}% complet</p>
          <p style="margin:0;" class="text-muted">Il manque : ${missingLabels}</p>
        </div>`;
    })
    .join('');

  const completeBlock = complete.length > 0
    ? `<p class="text-muted">${complete.length} de vos fiches sont déjà complètes.</p>`
    : '';

  const isPlural = incomplete.length > 1;
  const ctaLabel = isPlural ? 'mes fiches' : 'ma fiche';
  const introLine = isPlural
    ? `Vos fiches sont en ligne, mais plusieurs ont encore des champs vides que les patients attendent avant de prendre rendez-vous.`
    : `Votre fiche est en ligne, mais il lui manque encore quelques infos que les patients regardent avant de prendre rendez-vous.`;
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Quelques minutes pour compléter',
    `
    <p>${greeting}</p>

    <p>${introLine}</p>

    <h2>État de vos fiches</h2>
    ${centresBlock}
    ${completeBlock}

    <p>Trois champs font la différence : <strong>la photo de cabine</strong>, <strong>les horaires précis</strong> (y compris les coupures méridiennes) et <strong>une description de 3-4 phrases</strong> qui dit ce qui vous distingue. Les patients qui lisent ça avant d'appeler arrivent préparés, et la première consultation va plus vite.</p>

    <p><a href="${editUrl}" class="btn">Compléter ${ctaLabel}</a></p>

    <p>Si un champ du formulaire vous bloque ou si vous voulez un retour sur votre description avant de publier, répondez à ce mail, je regarde directement.</p>

    <p>Cordialement,<br/>
    Franck-Olivier Chabbat<br/>
    Audioprothésiste DE — LeGuideAuditif.fr</p>
    `,
    { unsubscribeToken },
  );
}
