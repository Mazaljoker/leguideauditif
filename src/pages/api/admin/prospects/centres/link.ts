export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase';
import { isValidUuid } from '../../../../../lib/prospects';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Auth via middleware SSR (locals.user) — évite la 2e setSession qui
    // consomme le rotating refresh token déjà utilisé par le middleware.
    const user = locals.user;
    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const body = await request.json();
    const { prospect_id, centre_id, set_primary } = body ?? {};

    if (!isValidUuid(prospect_id)) {
      return new Response(
        JSON.stringify({ error: 'prospect_id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!isValidUuid(centre_id)) {
      return new Response(
        JSON.stringify({ error: 'centre_id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const shouldSetPrimary = set_primary === true;

    const supabase = createServerClient();

    // Vérifie existence prospect + centre
    const [{ data: prospect }, { data: centre }] = await Promise.all([
      supabase.from('prospects').select('id').eq('id', prospect_id).maybeSingle(),
      supabase.from('centres_auditifs').select('id').eq('id', centre_id).maybeSingle(),
    ]);

    if (!prospect) {
      return new Response(
        JSON.stringify({ error: 'Prospect introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (!centre) {
      return new Response(
        JSON.stringify({ error: 'Centre introuvable.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Si on veut poser primary, démote les autres primary d'abord
    // (respecte l'index unique partiel is_primary=TRUE)
    if (shouldSetPrimary) {
      await supabase
        .from('prospect_centres')
        .update({ is_primary: false })
        .eq('prospect_id', prospect_id)
        .neq('centre_id', centre_id);
    }

    // UPSERT : si le lien existe déjà, mets à jour is_primary
    const { data: link, error: upsertError } = await supabase
      .from('prospect_centres')
      .upsert(
        {
          prospect_id,
          centre_id,
          is_primary: shouldSetPrimary,
          linked_via: 'manual',
        },
        { onConflict: 'prospect_id,centre_id' }
      )
      .select()
      .single();

    if (upsertError || !link) {
      console.error('[link centre]', upsertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du lien.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, link }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
