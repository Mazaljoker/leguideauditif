export const prerender = false;

// POST /api/audiopro/leads-mark-read
//   body: { leadId: string, read: boolean }
// Marque un lead comme lu (read_at = now()) ou non lu (read_at = null).
// Vérifie que le lead appartient bien à un centre claimed_by_email=user.email.

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

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

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Session invalide.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as { leadId?: unknown; read?: unknown };
    const leadId = typeof body.leadId === 'string' ? body.leadId : '';
    const read = typeof body.read === 'boolean' ? body.read : true;

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'leadId requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Vérifier que le lead appartient bien à un centre du user.
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, source')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || typeof lead.source !== 'string' || !lead.source.startsWith('centre/')) {
      return new Response(
        JSON.stringify({ error: 'Lead introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const slug = lead.source.slice('centre/'.length);
    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('claimed_by_email, claim_status')
      .eq('slug', slug)
      .single();

    const ownerEmail = (centre?.claimed_by_email ?? '').trim().toLowerCase();
    const userEmail = user.email.trim().toLowerCase();
    if (
      !centre ||
      centre.claim_status !== 'approved' ||
      ownerEmail !== userEmail
    ) {
      return new Response(
        JSON.stringify({ error: 'Lead non autorisé.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await supabase
      .from('leads')
      .update({ read_at: read ? new Date().toISOString() : null })
      .eq('id', leadId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
