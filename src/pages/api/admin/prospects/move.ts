export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import { isValidUuid } from '../../../../lib/prospects';
import {
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from '../../../../types/prospect';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_STATUSES: ProspectStatus[] = [
  'prospect', 'contacte', 'rdv', 'proposition', 'signe', 'perdu',
];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { id, from_status, to_status } = body ?? {};

    if (!isValidUuid(id)) {
      return new Response(
        JSON.stringify({ error: 'id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_STATUSES.includes(from_status as ProspectStatus)) {
      return new Response(
        JSON.stringify({ error: 'from_status invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_STATUSES.includes(to_status as ProspectStatus)) {
      return new Response(
        JSON.stringify({ error: 'to_status invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (from_status === to_status) {
      return new Response(
        JSON.stringify({ error: 'from_status et to_status doivent différer.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Anti-race : vérifie que le prospect est bien au statut from_status
    const { data: existing, error: fetchError } = await supabase
      .from('prospects')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return new Response(
        JSON.stringify({ error: 'Prospect introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existing.status !== from_status) {
      return new Response(
        JSON.stringify({
          error: 'Le prospect a été modifié entre-temps. Actualisez la page.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE statut
    const { data: prospect, error: updateError } = await supabase
      .from('prospects')
      .update({ status: to_status })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !prospect) {
      console.error('[move prospect]', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du déplacement.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // INSERT interaction status_change — best-effort
    // Si l'INSERT échoue (rare), on log mais on retourne quand même success
    // avec interaction: null. Accepté V1 mono-user (PRD §4.2).
    const fromLabel = PROSPECT_STATUS_LABELS[from_status as ProspectStatus];
    const toLabel = PROSPECT_STATUS_LABELS[to_status as ProspectStatus];
    const { data: interaction, error: interactionError } = await supabase
      .from('prospect_interactions')
      .insert({
        prospect_id: id,
        kind: 'status_change',
        content: `Déplacé de ${fromLabel} à ${toLabel}`,
      })
      .select()
      .single();

    if (interactionError) {
      console.error('[move prospect — interaction log failed]', interactionError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        prospect,
        interaction: interaction ?? null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
