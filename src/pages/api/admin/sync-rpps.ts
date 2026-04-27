/**
 * Endpoint de sync RPPS — déclenché par cron Vercel (1er + 15 du mois) ou
 * par le bouton "Lancer une sync manuelle" dans /admin/rpps-sync.
 *
 * Auth :
 *   - Cron Vercel : header `Authorization: Bearer ${CRON_SECRET}` (Vercel
 *     l'injecte automatiquement quand l'env var existe). On reconnait aussi
 *     `?source=cron` dans l'URL pour tagger trigger_source dans la DB.
 *   - Bouton manuel : session admin (locals.user.email === ADMIN_EMAIL).
 *
 * Réponse JSON :
 *   {
 *     status: 'success' | 'failed',
 *     run_id, inserted, updated, marked_inactive, duration, new_centres_count
 *   }
 *
 * Long-running : la sync FHIR peut prendre 30–60s. Vercel Function timeout par
 * défaut est de 300s (Fluid Compute) — largement suffisant.
 *
 * Cf. PRD sprint B (signal Thomas Perron Manéo Bayonne 2026-04-27).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { runRppsSync } from '../../../lib/rpps-sync';
import { sendSyncReport } from '../../../lib/rpps-sync-email';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, url, locals }) => {
  const cronSecret = import.meta.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isCronAuth = !!cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdminSession = locals.user?.email === ADMIN_EMAIL;

  if (!isCronAuth && !isAdminSession) {
    return json({ error: 'Unauthorized' }, 401);
  }

  // Le query param `?source=cron` permet d'annoter explicitement les runs
  // déclenchés par cron (Vercel lit le path tel quel — query inclus).
  const sourceParam = url.searchParams.get('source');
  const triggerSource: 'manual' | 'cron' = isCronAuth || sourceParam === 'cron' ? 'cron' : 'manual';

  // Garde-fou : si l'env FHIR n'est pas configurée, on échoue tôt avec un message clair
  // au lieu de partir en sync et laisser fetch() planter dans le helper.
  if (!import.meta.env.RPPS_FHIR_API_KEY) {
    return json({
      status: 'failed',
      error: 'RPPS_FHIR_API_KEY non configuré côté serveur. Ajouter la clé Gravitee dans Vercel env.',
    }, 500);
  }

  const supabase = createServerClient();

  try {
    const result = await runRppsSync(supabase, { triggerSource });

    // Envoi du rapport email (no-op si rien de nouveau et run réussi)
    try {
      await sendSyncReport(result);
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      console.error('[sync-rpps] email report failed (sync continues OK):', msg);
    }

    return json({
      status: result.status,
      run_id: result.runId,
      trigger_source: result.triggerSource,
      inserted: result.rppsInserted,
      updated: result.rppsUpdated,
      marked_inactive: result.rppsMarkedInactive,
      new_centres_count: result.newCentresDetected.length,
      duration_seconds: result.durationSeconds,
      error_message: result.errorMessage,
    }, result.status === 'success' ? 200 : 500);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync-rpps] unhandled error:', msg);
    return json({ status: 'failed', error: msg }, 500);
  }
};

// Vercel cron envoie un GET par défaut sur certains setups. On accepte les deux.
export const GET = POST;
