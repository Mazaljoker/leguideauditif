/**
 * Rapport email post-propagation RPPS → Franck-Olivier.
 *
 * Envoyé quand au moins 1 fiche est créée/updatée OU quand des fiches claimed
 * sont flagged pour review. Silence si run apply réussi sans aucun changement.
 * Email d'alerte distinct si run failed.
 */

import { sendEmail } from './email';
import type { PropagationRunResult, FlaggedForReview, ChangeApplied } from './rpps-propagate';

const ADMIN_EMAIL = import.meta.env.ADMIN_EMAIL ?? 'franckolivier@leguideauditif.fr';
const SITE_BASE = 'https://leguideauditif.fr';

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildFlaggedRows(flagged: FlaggedForReview[]): string {
  return flagged
    .map(
      (f) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 13px;">
          <a href="${SITE_BASE}/centre/${escapeHtml(f.centre_slug)}/" style="color: #1B2E4A; text-decoration: none; font-weight: 600;">${escapeHtml(f.practitioner_name)}</a><br/>
          <span style="color: #666; font-size: 11px;">${escapeHtml(f.centre_plan.toUpperCase())} · ${escapeHtml(f.claimed_by_email ?? '')}</span>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px; color: #444;">
          ${escapeHtml(f.change_summary)}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 13px;">
          <a href="${SITE_BASE}/admin/claims" style="color: #D97B3D;">Admin</a>
        </td>
      </tr>`,
    )
    .join('');
}

function buildChangesRows(changes: ChangeApplied[], applyMode: boolean): string {
  return changes
    .slice(0, 20) // limite cosmétique
    .map((c) => {
      const fieldsLabel = Object.keys(c.fields_changed).slice(0, 5).join(', ');
      const more = Object.keys(c.fields_changed).length > 5 ? ` +${Object.keys(c.fields_changed).length - 5}` : '';
      const link = c.centre_slug
        ? `<a href="${SITE_BASE}/centre/${escapeHtml(c.centre_slug)}/" style="color: #1B2E4A;">${escapeHtml(c.centre_slug)}</a>`
        : '<span style="color: #999;">(nouveau)</span>';
      const action = c.action === 'create' ? 'Créée' : 'Mise à jour';
      return `
        <tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px;">${escapeHtml(c.rpps)}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px;">${action}${applyMode ? '' : ' (dry-run)'}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 12px;">${link}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 11px; color: #666;">${escapeHtml(fieldsLabel)}${more}</td>
        </tr>`;
    })
    .join('');
}

function buildSuccessHtml(run: PropagationRunResult): string {
  const totalDelta = run.centresCreated + run.centresUpdated;
  const flaggedSection = run.flaggedForReview.length > 0
    ? `
      <tr><td style="padding: 16px 32px; font-family: sans-serif;">
        <div style="background: #FAEEDA; border-left: 4px solid #D97B3D; padding: 16px; border-radius: 6px; margin-bottom: 16px;">
          <h2 style="margin: 0 0 8px 0; color: #854F0B; font-size: 16px;">⚠️ ${run.flaggedForReview.length} fiche${run.flaggedForReview.length > 1 ? 's' : ''} claimed/premium à review</h2>
          <p style="margin: 0 0 12px 0; color: #633806; font-size: 13px;">
            Le RPPS de ces audios a changé, mais leur fiche est revendiquée — non touchée automatiquement. À décider au cas par cas.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(0,0,0,0.04);">
                <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666; text-transform: uppercase;">Praticien · Plan</th>
                <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666; text-transform: uppercase;">Change détecté</th>
                <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666; text-transform: uppercase;">Action</th>
              </tr>
            </thead>
            <tbody>${buildFlaggedRows(run.flaggedForReview)}</tbody>
          </table>
        </div>
      </td></tr>`
    : '';

  const changesSection = run.changesApplied.length > 0
    ? `
      <tr><td style="padding: 0 32px 16px 32px; font-family: sans-serif;">
        <h2 style="margin: 16px 0 12px 0; font-size: 16px; color: #1B2E4A;">
          ${totalDelta} change${totalDelta > 1 ? 's' : ''} ${run.applyMode ? 'appliqué' + (totalDelta > 1 ? 's' : '') : 'simulé' + (totalDelta > 1 ? 's' : '') + ' (dry-run)'}
        </h2>
        <p style="font-size: 12px; color: #666; margin: 0 0 12px 0;">
          ${run.changesApplied.length > 20 ? `Top 20 sur ${run.changesApplied.length}.` : ''}
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #eee;">
          <thead>
            <tr style="background: #F8F5F0;">
              <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666;">RPPS</th>
              <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666;">Action</th>
              <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666;">Fiche</th>
              <th style="padding: 8px 12px; text-align: left; font-family: sans-serif; font-size: 11px; color: #666;">Champs</th>
            </tr>
          </thead>
          <tbody>${buildChangesRows(run.changesApplied, run.applyMode)}</tbody>
        </table>
      </td></tr>`
    : '';

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #F8F5F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #F8F5F0; padding: 24px 0;">
    <tr><td align="center">
      <table width="720" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden; max-width: 100%;">

        <tr><td style="background: #1B2E4A; padding: 24px 32px; color: #fff; font-family: sans-serif;">
          <h1 style="margin: 0 0 8px 0; font-size: 22px;">Propagation RPPS → centres — ${formatDate(run.startedAt)}</h1>
          <p style="margin: 0; opacity: 0.85; font-size: 14px;">
            ${run.applyMode ? 'Mode <strong>APPLY</strong> — changements écrits en DB' : 'Mode <strong>DRY-RUN</strong> — aucun changement écrit'}
          </p>
        </td></tr>

        <tr><td style="padding: 24px 32px; font-family: sans-serif; color: #333;">
          <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #1B2E4A;">Résumé</h2>
          <table cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.7;">
            <tr><td style="padding-right: 16px; color: #666;">Trigger</td><td><strong>${run.triggerSource === 'cron' ? 'Cron Vercel' : 'Manuel'}</strong></td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Durée</td><td>${run.durationSeconds}&nbsp;s</td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Période</td><td>depuis ${run.sinceIso?.substring(0, 10) ?? '—'}</td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Fiches créées</td><td><strong style="color: #2e7d32;">+${run.centresCreated}</strong></td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Fiches mises à jour</td><td><strong style="color: #1976d2;">${run.centresUpdated}</strong></td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Skip claimed (review)</td><td><strong style="color: #d97706;">${run.centresSkippedClaimed}</strong></td></tr>
          </table>
        </td></tr>

        ${flaggedSection}
        ${changesSection}

        <tr><td style="padding: 16px 32px 32px 32px; text-align: center; font-family: sans-serif;">
          <a href="${SITE_BASE}/admin/rpps-propagate/" style="display: inline-block; background: #D97B3D; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Ouvrir l'admin LGA
          </a>
        </td></tr>

        <tr><td style="padding: 12px 32px; background: #F8F5F0; text-align: center; font-family: sans-serif; font-size: 12px; color: #999;">
          Run ID : ${escapeHtml(run.runId)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
}

function buildFailureHtml(run: PropagationRunResult): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #F8F5F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden;">
        <tr><td style="background: #A32D2D; padding: 24px 32px; color: #fff; font-family: sans-serif;">
          <h1 style="margin: 0 0 8px 0; font-size: 22px;">Échec propagation RPPS — ${formatDate(run.startedAt)}</h1>
        </td></tr>
        <tr><td style="padding: 24px 32px; font-family: sans-serif; color: #333; font-size: 14px; line-height: 1.6;">
          <p>La propagation RPPS a échoué après ${run.durationSeconds}&nbsp;s.</p>
          <pre style="background: #f8f8f8; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; color: #c00;">${escapeHtml(run.errorMessage ?? 'Erreur inconnue')}</pre>
          <p>Voir <a href="${SITE_BASE}/admin/rpps-propagate/" style="color: #D97B3D;">/admin/rpps-propagate</a>.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
}

export async function sendPropagationReport(run: PropagationRunResult): Promise<void> {
  if (run.status === 'failed') {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[LGA] Échec propagation RPPS du ${formatDate(run.startedAt)}`,
      html: buildFailureHtml(run),
    });
    return;
  }
  // Success : on envoie SI il y a quelque chose à dire
  const hasContent =
    run.centresCreated > 0 ||
    run.centresUpdated > 0 ||
    run.flaggedForReview.length > 0;
  if (!hasContent) return;

  const mode = run.applyMode ? '' : ' (dry-run)';
  const subject = `[LGA] Propagation RPPS du ${formatDate(run.startedAt)}${mode} : +${run.centresCreated} créées, ${run.centresUpdated} màj, ${run.flaggedForReview.length} à review`;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    html: buildSuccessHtml(run),
  });
}
