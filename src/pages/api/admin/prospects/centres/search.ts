export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase';
import { isValidUuid } from '../../../../../lib/prospects';
import type { CentreSearchResult } from '../../../../../types/prospect';

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
    const { q, prospect_id } = body ?? {};

    if (typeof q !== 'string' || q.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'q doit contenir au moins 2 caractères.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidUuid(prospect_id)) {
      return new Response(
        JSON.stringify({ error: 'prospect_id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = q.trim().slice(0, 100);
    const supabase = createServerClient();

    // Récupère les ids déjà liés (à exclure)
    const { data: existingLinks } = await supabase
      .from('prospect_centres')
      .select('centre_id')
      .eq('prospect_id', prospect_id);

    const excludedIds = (existingLinks ?? []).map((l) => l.centre_id as string);

    // ILIKE insensible à la casse (pas unaccent côté PostgREST —
    // acceptable V1, note PRD §1.3 endpoint search).
    const pattern = `${trimmed}%`;

    let query = supabase
      .from('centres_auditifs')
      .select('id, slug, nom, ville, cp, departement, audio_nom, audio_prenom')
      .or(`nom.ilike.${pattern},ville.ilike.${pattern},cp.ilike.${pattern}`)
      .order('nom', { ascending: true })
      .limit(15);

    if (excludedIds.length > 0) {
      query = query.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('[search centres]', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la recherche.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, centres: (data ?? []) as CentreSearchResult[] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
