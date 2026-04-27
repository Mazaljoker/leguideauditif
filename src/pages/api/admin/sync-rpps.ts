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
import { runRolesSync } from '../../../lib/rpps-roles-sync';
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

  // Mode `full` : pull complet + marquage inactif. Mode défaut `incremental` :
  // ne pulle que les changes via _lastUpdated=ge{lastRunDate} (cf. skill lga-rpps-detector).
  const mode = url.searchParams.get('mode') === 'full' ? 'full' : 'incremental';

  // V2 — phase 2 : pull les PractitionerRole (multi-lieux) en plus des Practitioner.
  // Defaut activé (signal Thomas Perron : sans phase 2, on rate les lieux secondaires).
  // `?phase=v1` : V1 only (skip V2) — debug/rollback rapide.
  // `?phase=v2` : V2 only (skip V1) — rattrapage ciblé multi-lieux sans toucher
  //   à la sync Practitioner principale (utile combiné à `?mode=full`).
  const phaseParam = url.searchParams.get('phase');
  const runV1 = phaseParam !== 'v2';
  const runRoles = phaseParam !== 'v1';

  // Garde-fou : si la clé FHIR n'est pas configurée, on échoue tôt avec un message clair
  // au lieu de partir en sync et laisser fetch() planter dans le helper.
  // ESANTE_API_KEY = nom canonique (cf. skill lga-rpps-detector). Fallback sur
  // l'ancien nom RPPS_FHIR_API_KEY pour les preview deployments en transition.
  if (!import.meta.env.ESANTE_API_KEY && !import.meta.env.RPPS_FHIR_API_KEY) {
    return json({
      status: 'failed',
      error: 'ESANTE_API_KEY non configuré côté serveur. Ajouter la clé Gravitee dans Vercel env.',
    }, 500);
  }

  const supabase = createServerClient();

  try {
    // Phase 1 — Practitioner sync (V1, alimente rpps_audioprothesistes).
    // Skipped si `?phase=v2` (rattrapage V2 ciblé sans toucher V1).
    const result = runV1
      ? await runRppsSync(supabase, { triggerSource, mode })
      : null;

    // Phase 2 — PractitionerRole sync (V2, alimente rpps_practitioner_roles).
    // Lance seulement si V1 a réussi (ou skip si phase=v2). La borne `sinceIso`
    // est calculée par runRolesSync via MAX(last_seen_at) — auto-entretenu.
    let rolesResult: Awaited<ReturnType<typeof runRolesSync>> | null = null;
    let rolesError: string | null = null;
    const v1Ok = !runV1 || result?.status === 'success';
    if (runRoles && v1Ok) {
      try {
        rolesResult = await runRolesSync(supabase, { mode });
      } catch (err) {
        rolesError = err instanceof Error ? err.message : String(err);
        console.error('[sync-rpps] phase 2 roles failed:', rolesError);
      }
    }

    // Envoi du rapport email (skip pour V2-only — pas de stats V1 à reporter)
    if (result) {
      try {
        await sendSyncReport(result, runRoles ? { rolesResult, rolesError } : undefined);
      } catch (emailErr) {
        const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
        console.error('[sync-rpps] email report failed (sync continues OK):', msg);
      }
    }

    const phase2Stats = rolesResult ? {
      processed: rolesResult.rolesProcessed,
      upserted: rolesResult.rolesUpserted,
      skipped_no_rpps: rolesResult.rolesSkippedNoRpps,
      organizations_resolved: rolesResult.organizationsResolved,
      duration_seconds: rolesResult.durationSeconds,
    } : null;

    if (!result) {
      // V2-only response
      return json({
        status: rolesError ? 'failed' : 'success',
        phase: 'v2',
        roles: phase2Stats,
        roles_error: rolesError,
      }, rolesError ? 500 : 200);
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
      // V2 — phase 2 stats
      roles: phase2Stats,
      roles_error: rolesError,
    }, result.status === 'success' ? 200 : 500);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync-rpps] unhandled error:', msg);
    return json({ status: 'failed', error: msg }, 500);
  }
};

// Vercel cron envoie un GET par défaut sur certains setups. On accepte les deux.
export const GET = POST;
