export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase';
import { validateProspectInput } from '../../../../lib/prospects';

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

    // claim_email : champ optionnel hors schéma prospects, consommé uniquement
    // pour l'auto-lien centre via claim_attributions (Phase 5.0).
    const claimEmail =
      typeof body?.claim_email === 'string' && body.claim_email.trim().length > 0
        ? body.claim_email.trim().toLowerCase()
        : null;

    const validation = validateProspectInput(body, { requireName: true });

    if (!validation.ok) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();
    const { data: prospect, error: insertError } = await supabase
      .from('prospects')
      .insert(validation.data)
      .select()
      .single();

    if (insertError || !prospect) {
      console.error('[create prospect]', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Auto-lien centre sur revendication (Phase 5.0) :
    // si source='entrant' ET claim_email fourni, matche dans claim_attributions
    // et crée le lien prospect_centres avec linked_via='auto_claim'.
    if (prospect.source === 'entrant' && claimEmail) {
      const { data: attribution } = await supabase
        .from('claim_attributions')
        .select('centre_id')
        .eq('claimed_by_email', claimEmail)
        .not('centre_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attribution?.centre_id) {
        await supabase
          .from('prospects')
          .update({ centre_id: attribution.centre_id })
          .eq('id', prospect.id);

        await supabase.from('prospect_centres').insert({
          prospect_id: prospect.id,
          centre_id: attribution.centre_id,
          is_primary: true,
          linked_via: 'auto_claim',
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, prospect }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
