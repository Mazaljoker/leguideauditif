export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

type ProspectStatus = 'prospect' | 'contacte';
const VALID_STATUSES: readonly ProspectStatus[] = ['prospect', 'contacte'];

/**
 * Bascule un revendicateur du pipeline automatique vers le CRM commercial.
 * Déclenché par le bouton "Promouvoir en prospect" dans /admin/claims/[id]
 * (Étape 3). Auth : Pattern B inline.
 *
 * Effets :
 *   1. Crée une ligne `prospects` avec données pré-remplies
 *   2. Lie tous les centres de l'audio via `prospect_centres` (auto_claim)
 *   3. Peuple `audiopro_lifecycle.prospect_id`
 *   4. Trace event `promoted_to_prospect` dans lifecycle_events
 *
 * Règle métier : un audio déjà lié à un prospect ne peut pas être re-promu
 * (409 avec le prospect_id existant pour permettre la redirection).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || user.email !== ADMIN_EMAIL) {
    return json({ error: 'Non autorisé.' }, 401);
  }

  let body: {
    audiopro_id?: string;
    initial_status?: string;
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Body JSON invalide.' }, 400);
  }

  const { audiopro_id } = body;
  if (!audiopro_id) {
    return json({ error: 'audiopro_id requis.' }, 400);
  }

  const initial_status: ProspectStatus =
    VALID_STATUSES.includes(body.initial_status as ProspectStatus)
      ? (body.initial_status as ProspectStatus)
      : 'contacte';

  const notes = typeof body.notes === 'string' && body.notes.trim().length > 0
    ? body.notes.trim()
    : null;

  const supabase = createServerClient();

  const { data: audiopro } = await supabase
    .from('audiopro_lifecycle')
    .select('*')
    .eq('id', audiopro_id)
    .maybeSingle();

  if (!audiopro) {
    return json({ error: 'Audio introuvable.' }, 404);
  }

  if (audiopro.prospect_id) {
    return json(
      {
        error: 'Audio déjà lié à un prospect.',
        prospect_id: audiopro.prospect_id,
      },
      409,
    );
  }

  // Liste des centres liés pour centres_count + liens prospect_centres
  const { data: centreLinks } = await supabase
    .from('audiopro_centres')
    .select('centre_id')
    .eq('audiopro_id', audiopro_id);

  const centres = centreLinks ?? [];
  // prospects.centres_count a un CHECK >= 1 (migration 012). On force le minimum.
  const centresCount = Math.max(1, centres.length);

  const fullName = [audiopro.prenom, audiopro.nom]
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .join(' ')
    .trim() || audiopro.email;

  const { data: newProspect, error: insertErr } = await supabase
    .from('prospects')
    .insert({
      name: fullName,
      emails: [audiopro.email],
      source: 'entrant',
      status: initial_status,
      is_fondateur: false,
      centres_count: centresCount,
      notes,
    })
    .select('id')
    .single();

  if (insertErr || !newProspect) {
    console.error('[promote-to-prospect] prospects insert error:', insertErr?.message);
    return json(
      { error: `Erreur création prospect : ${insertErr?.message ?? 'inconnue'}` },
      500,
    );
  }

  // Liaison N-N prospect_centres (linked_via='auto_claim' autorisé par la 013)
  if (centres.length > 0) {
    const centreInserts = centres.map((c, idx) => ({
      prospect_id: newProspect.id,
      centre_id: c.centre_id,
      is_primary: idx === 0,
      linked_via: 'auto_claim' as const,
    }));
    const { error: linksErr } = await supabase
      .from('prospect_centres')
      .insert(centreInserts);
    if (linksErr) {
      console.error('[promote-to-prospect] prospect_centres insert error:', linksErr.message);
      // Non bloquant — le prospect est créé, Franck peut lier manuellement.
    }
  }

  // Update audiopro_lifecycle.prospect_id
  const { error: updateErr } = await supabase
    .from('audiopro_lifecycle')
    .update({ prospect_id: newProspect.id })
    .eq('id', audiopro_id);

  if (updateErr) {
    console.error('[promote-to-prospect] audiopro update error:', updateErr.message);
    // Non bloquant — le prospect existe, on pourra relier manuellement.
  }

  // Event lifecycle (pas de transition stage — juste trace)
  try {
    await supabase.from('audiopro_lifecycle_events').insert({
      audiopro_id,
      from_stage: audiopro.lifecycle_stage,
      to_stage: audiopro.lifecycle_stage,
      reason: 'promoted_to_prospect',
      metadata: {
        prospect_id: newProspect.id,
        initial_status,
        nb_centres: centres.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[promote-to-prospect] lifecycle event failed:', msg);
  }

  return json({ success: true, prospect_id: newProspect.id }, 200);
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
