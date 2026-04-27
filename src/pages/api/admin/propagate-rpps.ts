/**
 * Endpoint de propagation RPPS → centres_auditifs.
 *
 * Trigger :
 *   - Cron Vercel : 04:30 UTC le 1er + 15 (30 min après /api/admin/sync-rpps)
 *   - Manuel : bouton dans /admin/rpps-propagate avec toggle dry-run/apply
 *
 * Auth : Authorization Bearer ${CRON_SECRET} OU session admin.
 *
 * Query params :
 *   - source=cron      : tag du trigger (sinon manual)
 *   - apply=true|false : true = écrit en DB, false = dry-run (défaut)
 *
 * Cf. PRD sprint A propagation (Thomas Perron Manéo Bayonne).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { runRppsPropagation } from '../../../lib/rpps-propagate';
import { sendPropagationReport } from '../../../lib/rpps-propagate-email';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, url, locals }) => {
  // Auth dual : cron Vercel OU session admin
  const cronSecret = import.meta.env.CRON_SECRET ?? process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isCronAuth = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdminSession = locals.user?.email === ADMIN_EMAIL;

  if (!isCronAuth && !isAdminSession) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const sourceParam = url.searchParams.get('source');
  const triggerSource: 'manual' | 'cron' = isCronAuth || sourceParam === 'cron' ? 'cron' : 'manual';

  // apply=true → écrit en DB. apply=false (défaut) → dry-run.
  // Le cron ne tourne qu'en apply=true (cf. vercel.json — on ajoute le param).
  const applyMode = url.searchParams.get('apply') === 'true';

  const supabase = createServerClient();

  try {
    const result = await runRppsPropagation(supabase, { triggerSource, applyMode });

    try {
      await sendPropagationReport(result);
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error('[propagate-rpps] email report failed (run continues OK):', msg);
    }

    return json({
      status: result.status,
      run_id: result.runId,
      trigger_source: result.triggerSource,
      apply_mode: result.applyMode,
      centres_created: result.centresCreated,
      centres_updated: result.centresUpdated,
      centres_skipped_claimed: result.centresSkippedClaimed,
      centres_unmatched: result.centresUnmatched,
      flagged_count: result.flaggedForReview.length,
      duration_seconds: result.durationSeconds,
      error_message: result.errorMessage,
    }, result.status === 'success' ? 200 : 500);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[propagate-rpps] unhandled error:', msg);
    return json({ status: 'failed', error: msg }, 500);
  }
};

// Vercel cron envoie GET sur certains setups
export const GET = POST;
