/**
 * Rapport email post-sync RPPS → Franck-Olivier.
 *
 * Envoyé quand new_centres_detected.length > 0 (silence si rien de nouveau pour
 * éviter le bruit). En cas d'échec de sync, un email distinct est envoyé.
 *
 * Pattern aligné sur src/lib/email.ts (Resend, FROM_EMAIL identique).
 */

import { sendEmail } from './email';
import type { SyncRunResult, NewCentreDetected } from './rpps-sync';
import type { RolesSyncResult } from './rpps-roles-sync';

export interface RolesSyncSummary {
  rolesResult: RolesSyncResult | null;
  rolesError: string | null;
}

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

function linkedinSearchUrl(centre: NewCentreDetected): string {
  const keywords = [centre.prenom, centre.nom].filter(Boolean).join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;
}

function googleSearchUrl(centre: NewCentreDetected): string {
  const parts = [centre.prenom, centre.nom, centre.commune, 'audioprothésiste'].filter(Boolean);
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(' '))}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function buildRolesSection(summary: RolesSyncSummary | undefined): string {
  if (!summary) return '';
  if (summary.rolesError) {
    return `
      <tr><td style="padding: 0 32px 16px 32px; font-family: sans-serif; color: #333;">
        <h2 style="margin: 16px 0 12px 0; font-size: 16px; color: #A32D2D;">Phase 2 — multi-lieux (échec)</h2>
        <p style="font-size: 13px; color: #666; margin: 0 0 8px 0;">
          La phase 2 (PractitionerRole / multi-lieux d'exercice) a échoué. La phase 1 (Practitioner) reste valide.
        </p>
        <pre style="background: #fff5f5; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; color: #c00; border-left: 3px solid #A32D2D;">${escapeHtml(summary.rolesError)}</pre>
      </td></tr>`;
  }
  const r = summary.rolesResult;
  if (!r) return '';
  return `
      <tr><td style="padding: 0 32px 16px 32px; font-family: sans-serif; color: #333;">
        <h2 style="margin: 16px 0 12px 0; font-size: 16px; color: #1B2E4A;">Phase 2 — multi-lieux d'exercice</h2>
        <p style="font-size: 13px; color: #666; margin: 0 0 12px 0;">
          Sync FHIR PractitionerRole : 1 ligne par lieu d'exercice (un audio peut avoir 2-5 lieux).
        </p>
        <table cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.7;">
          <tr><td style="padding-right: 16px; color: #666;">Rôles traités</td><td><strong>${r.rolesProcessed}</strong></td></tr>
          <tr><td style="padding-right: 16px; color: #666;">Rôles upsert</td><td><strong style="color: #2e7d32;">${r.rolesUpserted}</strong></td></tr>
          <tr><td style="padding-right: 16px; color: #666;">Skipped (RPPS introuvable)</td><td>${r.rolesSkippedNoRpps}</td></tr>
          <tr><td style="padding-right: 16px; color: #666;">Organizations résolues</td><td>${r.organizationsResolved}</td></tr>
          <tr><td style="padding-right: 16px; color: #666;">Durée phase 2</td><td>${r.durationSeconds}&nbsp;s</td></tr>
        </table>
      </td></tr>`;
}

function buildSuccessHtml(run: SyncRunResult, rolesSummary?: RolesSyncSummary): string {
  const rows = run.newCentresDetected
    .map((c) => {
      // Contact direct si publié dans l'Annuaire Santé (~10% des cas).
      // Sinon liens de recherche LinkedIn/Google pour enrichissement manuel
      // (le skill lga-rpps-enricher couvre l'enrichissement automatique en V2).
      const contactCell = c.email || c.telephone
        ? [
            c.email ? `<a href="mailto:${encodeURIComponent(c.email)}" style="color: #2e7d32; text-decoration: none; font-weight: 600;">${escapeHtml(c.email)}</a>` : '',
            c.telephone ? `<a href="tel:${encodeURIComponent(c.telephone)}" style="color: #1B2E4A; text-decoration: none;">${escapeHtml(c.telephone)}</a>` : '',
          ].filter(Boolean).join('<br/>')
        : `<span style="color: #999; font-size: 12px;">non publié</span>`;
      return `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px;">
          <strong>${escapeHtml(c.prenom)} ${escapeHtml(c.nom)}</strong>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px;">
          ${escapeHtml(c.enseigne ?? c.raison_sociale ?? '—')}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 14px;">
          ${escapeHtml(c.commune ?? '—')}<br/>
          <span style="color: #666; font-size: 12px;">${escapeHtml(c.code_postal ?? '')}</span>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 13px;">
          ${contactCell}
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #eee; font-family: sans-serif; font-size: 13px;">
          <a href="${linkedinSearchUrl(c)}" style="color: #0A66C2; text-decoration: none;">LinkedIn</a>
          &nbsp;·&nbsp;
          <a href="${googleSearchUrl(c)}" style="color: #1a73e8; text-decoration: none;">Google</a>
        </td>
      </tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #F8F5F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #F8F5F0; padding: 24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden; max-width: 100%;">
        <tr><td style="background: #1B2E4A; padding: 24px 32px; color: #fff; font-family: sans-serif;">
          <h1 style="margin: 0 0 8px 0; font-size: 22px;">Sync RPPS du ${formatDate(run.startedAt)}</h1>
          <p style="margin: 0; opacity: 0.85; font-size: 14px;">
            ${run.newCentresDetected.length} nouvelle${run.newCentresDetected.length > 1 ? 's' : ''} ouverture${run.newCentresDetected.length > 1 ? 's' : ''} détectée${run.newCentresDetected.length > 1 ? 's' : ''}
          </p>
        </td></tr>

        <tr><td style="padding: 24px 32px; font-family: sans-serif; color: #333;">
          <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #1B2E4A;">Résumé du run</h2>
          <table cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.7;">
            <tr><td style="padding-right: 16px; color: #666;">Trigger</td><td><strong>${run.triggerSource === 'cron' ? 'Cron Vercel' : 'Manuel'}</strong></td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Durée</td><td>${run.durationSeconds}&nbsp;s</td></tr>
            <tr><td style="padding-right: 16px; color: #666;">RPPS insérés</td><td><strong style="color: #2e7d32;">+${run.rppsInserted}</strong></td></tr>
            <tr><td style="padding-right: 16px; color: #666;">RPPS mis à jour</td><td>${run.rppsUpdated}</td></tr>
            <tr><td style="padding-right: 16px; color: #666;">RPPS marqués inactifs</td><td>${run.rppsMarkedInactive}</td></tr>
            <tr><td style="padding-right: 16px; color: #666;">Total avant / après</td><td>${run.rppsCountBefore} → ${run.rppsCountAfter}</td></tr>
          </table>
        </td></tr>

        ${buildRolesSection(rolesSummary)}

        <tr><td style="padding: 8px 32px 24px 32px; font-family: sans-serif; color: #333;">
          <h2 style="margin: 16px 0 12px 0; font-size: 16px; color: #1B2E4A;">Nouvelles ouvertures détectées</h2>
          <p style="font-size: 13px; color: #666; margin: 0 0 16px 0;">
            Ces audioprothésistes apparaissent pour la première fois dans le RPPS. À filer en CRM ou à contacter pour onboarding.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #eee; border-radius: 6px;">
            <thead>
              <tr style="background: #F8F5F0;">
                <th style="padding: 10px 12px; text-align: left; font-family: sans-serif; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Praticien</th>
                <th style="padding: 10px 12px; text-align: left; font-family: sans-serif; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Centre / Raison sociale</th>
                <th style="padding: 10px 12px; text-align: left; font-family: sans-serif; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Localisation</th>
                <th style="padding: 10px 12px; text-align: left; font-family: sans-serif; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Contact RPPS</th>
                <th style="padding: 10px 12px; text-align: left; font-family: sans-serif; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Recherches</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td></tr>

        <tr><td style="padding: 16px 32px 32px 32px; text-align: center; font-family: sans-serif;">
          <a href="${SITE_BASE}/admin/rpps-sync/" style="display: inline-block; background: #D97B3D; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
            Ouvrir l'admin LGA
          </a>
        </td></tr>

        <tr><td style="padding: 16px 32px; background: #F8F5F0; text-align: center; font-family: sans-serif; font-size: 12px; color: #999;">
          Run ID : ${escapeHtml(run.runId)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

function buildFailureHtml(run: SyncRunResult): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin: 0; padding: 0; background: #F8F5F0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 12px; overflow: hidden;">
        <tr><td style="background: #A32D2D; padding: 24px 32px; color: #fff; font-family: sans-serif;">
          <h1 style="margin: 0 0 8px 0; font-size: 22px;">Échec sync RPPS — ${formatDate(run.startedAt)}</h1>
          <p style="margin: 0; opacity: 0.85; font-size: 14px;">Trigger : ${run.triggerSource === 'cron' ? 'Cron Vercel' : 'Manuel'}</p>
        </td></tr>
        <tr><td style="padding: 24px 32px; font-family: sans-serif; color: #333; font-size: 14px; line-height: 1.6;">
          <p>La sync RPPS a échoué après ${run.durationSeconds}&nbsp;s.</p>
          <p><strong>Erreur :</strong></p>
          <pre style="background: #f8f8f8; padding: 12px; border-radius: 6px; overflow: auto; font-size: 12px; color: #c00;">${escapeHtml(run.errorMessage ?? 'Erreur inconnue')}</pre>
          <p>Voir <a href="${SITE_BASE}/admin/rpps-sync/" style="color: #D97B3D;">/admin/rpps-sync</a> pour relancer manuellement.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Envoie le rapport email approprié selon l'issue du run.
 * - Run success + new_centres > 0 → email résumé avec tableau (incl. phase 2 roles)
 * - Run success + 0 new_centres + phase 2 OK → no-op (silence)
 * - Run success + 0 new_centres + phase 2 KO → email d'alerte phase 2
 * - Run failed → email d'alerte distinct
 *
 * @param rolesSummary V2 — stats phase 2 PractitionerRole (multi-lieux)
 */
export async function sendSyncReport(
  run: SyncRunResult,
  rolesSummary?: RolesSyncSummary,
): Promise<void> {
  if (run.status === 'failed') {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[LGA] Échec sync RPPS du ${formatDate(run.startedAt)}`,
      html: buildFailureHtml(run),
    });
    return;
  }
  // Cas spécial : phase 1 OK mais phase 2 KO et pas de nouvelle ouverture
  // → on envoie quand même un email d'alerte sur le roles_error pour pas le rater.
  if (run.newCentresDetected.length === 0 && rolesSummary?.rolesError) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `[LGA] Sync RPPS ${formatDate(run.startedAt)} : phase 2 multi-lieux a échoué`,
      html: buildSuccessHtml(run, rolesSummary),
    });
    return;
  }
  if (run.newCentresDetected.length === 0) {
    return; // pas de bruit
  }
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[LGA] Sync RPPS du ${formatDate(run.startedAt)} : ${run.newCentresDetected.length} nouvelle${run.newCentresDetected.length > 1 ? 's' : ''} ouverture${run.newCentresDetected.length > 1 ? 's' : ''} détectée${run.newCentresDetected.length > 1 ? 's' : ''}`,
    html: buildSuccessHtml(run, rolesSummary),
  });
}
