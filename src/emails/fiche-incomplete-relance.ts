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
}

/**
 * Template de relance manuelle sur la complétude de fiche.
 * Seul template Phase 1 déclenchable via /api/admin/relance-email.
 *
 * NOTE : copy placeholder entre <!-- BEGIN COPY --> et <!-- END COPY --> à
 * humaniser via nposts-social-humanizer avant mise en production.
 */
export function ficheIncompleteRelanceEmail(data: FicheIncompleteRelanceData): string {
  const { prenom, centres } = data;

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

  const ctaLabel = incomplete.length === 1 ? 'ma fiche' : 'mes fiches';
  const greeting = prenom ? `Bonjour ${prenom},` : 'Bonjour,';

  return emailLayout(
    'Votre fiche mérite quelques minutes',
    `
    <!-- BEGIN COPY -->
    <p>${greeting}</p>

    <p>Votre fiche est visible sur LeGuideAuditif, mais il manque encore quelques infos pour que les patients aient une vue complète de votre centre.</p>

    <h2>État de vos fiches</h2>
    ${centresBlock}
    ${completeBlock}

    <p>D'expérience, les fiches complètes reçoivent en moyenne 3 fois plus de demandes de contact patient que les fiches partielles. Quelques minutes suffisent pour combler les champs manquants.</p>

    <p><a href="${editUrl}" class="btn">Compléter ${ctaLabel}</a></p>

    <p>Si vous avez besoin d'un coup de main, répondez directement à ce mail.</p>

    <p>Cordialement,<br/>Franck-Olivier Chabbat<br/>Audioprothésiste DE — LeGuideAuditif.fr</p>
    <!-- END COPY -->
    `,
  );
}
