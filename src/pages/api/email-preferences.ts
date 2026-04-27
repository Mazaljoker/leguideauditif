/**
 * Endpoint POST de la page /email-preferences.
 *
 * Auth = token UUID dans le body (form data ou JSON). Pas de session
 * Supabase — pattern standard pour pages d'unsub embarquées en email.
 *
 * Effets :
 *   - level=soft       → email_unsubscribed_at = NOW(), unsubscribe_level = 'soft'
 *   - level=hard       → email_unsubscribed_at = NOW(), unsubscribe_level = 'hard'
 *   - level=reactivate → email_unsubscribed_at = NULL, unsubscribe_level = NULL
 *
 * Trace dans audiopro_lifecycle_events pour audit (sans changement de stage).
 *
 * Redirige vers /email-preferences/?token=...&done=1&level=... pour le
 * feedback utilisateur (idempotent à F5 grâce au query param).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase';

type PreferenceLevel = 'soft' | 'hard' | 'reactivate';

const VALID_LEVELS: readonly PreferenceLevel[] = ['soft', 'hard', 'reactivate'];

export const POST: APIRoute = async ({ request, redirect }) => {
  // Parse body : form-urlencoded ou JSON
  let token = '';
  let level: PreferenceLevel | null = null;

  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body = await request.json();
      token = String(body?.token ?? '').trim();
      level = VALID_LEVELS.includes(body?.level) ? (body.level as PreferenceLevel) : null;
    } else {
      const formData = await request.formData();
      token = String(formData.get('token') ?? '').trim();
      const rawLevel = String(formData.get('level') ?? '');
      level = VALID_LEVELS.includes(rawLevel as PreferenceLevel) ? (rawLevel as PreferenceLevel) : null;
    }
  } catch {
    return json({ error: 'Body invalide' }, 400);
  }

  if (!token) return json({ error: 'token requis' }, 400);
  if (!level) return json({ error: 'level invalide (soft, hard, reactivate)' }, 400);

  const supabase = createServerClient();

  // Lookup audiopro par token
  const { data: audiopro } = await supabase
    .from('audiopro_lifecycle')
    .select('id, lifecycle_stage, unsubscribe_level')
    .eq('email_preferences_token', token)
    .maybeSingle();

  if (!audiopro) {
    return json({ error: 'Token invalide ou expiré' }, 404);
  }

  const previousLevel = audiopro.unsubscribe_level;

  // Update selon le choix
  let updateFields: Record<string, unknown>;
  let eventReason: string;
  if (level === 'reactivate') {
    updateFields = {
      email_unsubscribed_at: null,
      unsubscribe_level: null,
    };
    eventReason = 'email_resubscribed';
  } else {
    updateFields = {
      email_unsubscribed_at: new Date().toISOString(),
      unsubscribe_level: level,
    };
    eventReason = level === 'hard' ? 'email_unsubscribed_hard' : 'email_unsubscribed_soft';
  }

  const { error: updateError } = await supabase
    .from('audiopro_lifecycle')
    .update(updateFields)
    .eq('id', audiopro.id);

  if (updateError) {
    console.error('[email-preferences] update failed:', updateError.message);
    return json({ error: 'Erreur lors de la mise à jour' }, 500);
  }

  // Audit trail (sans changement de stage)
  try {
    await supabase.from('audiopro_lifecycle_events').insert({
      audiopro_id: audiopro.id,
      from_stage: audiopro.lifecycle_stage,
      to_stage: audiopro.lifecycle_stage,
      reason: eventReason,
      metadata: { previous_level: previousLevel, new_level: level === 'reactivate' ? null : level },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[email-preferences] event log failed:', msg);
  }

  // Redirige vers la page de confirmation. Token + level dans l'URL pour
  // que la page affiche le feedback adéquat (et soit refraîchissable F5).
  return redirect(`/email-preferences/?token=${encodeURIComponent(token)}&done=1&level=${level}`, 303);
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
