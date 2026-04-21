export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../../lib/supabase';
import { isValidUuid } from '../../../../../lib/prospects';
import type { InteractionKind } from '../../../../../types/prospect';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';
const VALID_KINDS: InteractionKind[] = ['dm', 'call', 'email', 'note', 'meeting', 'status_change'];
const MAX_CONTENT = 5000;

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
    const { prospect_id, kind, content, occurred_at } = body ?? {};

    if (!isValidUuid(prospect_id)) {
      return new Response(
        JSON.stringify({ error: 'prospect_id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_KINDS.includes(kind)) {
      return new Response(
        JSON.stringify({ error: 'kind invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof content !== 'string' || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'content requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmedContent = content.trim().slice(0, MAX_CONTENT);

    let occurredAtIso: string;
    if (occurred_at === undefined || occurred_at === null || occurred_at === '') {
      occurredAtIso = new Date().toISOString();
    } else if (typeof occurred_at === 'string') {
      const d = new Date(occurred_at);
      if (isNaN(d.getTime())) {
        return new Response(
          JSON.stringify({ error: 'occurred_at invalide.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      occurredAtIso = d.toISOString();
    } else {
      return new Response(
        JSON.stringify({ error: 'occurred_at invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Vérifie que le prospect existe (anti-dangling interaction)
    const { data: existing } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospect_id)
      .single();

    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'Prospect introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: interaction, error: insertError } = await supabase
      .from('prospect_interactions')
      .insert({
        prospect_id,
        kind,
        content: trimmedContent,
        occurred_at: occurredAtIso,
      })
      .select()
      .single();

    if (insertError || !interaction) {
      console.error('[create interaction]', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, interaction }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
