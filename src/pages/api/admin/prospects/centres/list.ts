export const prerender = false;

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase';
import { isValidUuid } from '../../../../../lib/prospects';
import {
  COMPLETENESS_FIELDS,
  type CentreAuditif,
  type LinkedCentre,
} from '../../../../../types/prospect';

const ADMIN_EMAIL = 'franckolivier@leguideauditif.fr';

function computeCompleteness(c: CentreAuditif): number {
  let filled = 0;
  for (const f of COMPLETENESS_FIELDS) {
    const v = c[f];
    if (v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    filled++;
  }
  return Math.round((filled / COMPLETENESS_FIELDS.length) * 100);
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Auth via middleware SSR — évite la double setSession qui consomme
    // le refresh token rotating deux fois (provoque 401 intermittent).
    const user = locals.user;
    if (!user || user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { prospect_id } = body ?? {};

    if (!isValidUuid(prospect_id)) {
      return new Response(
        JSON.stringify({ error: 'prospect_id UUID invalide.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Jointure via PostgREST embed : centres_auditifs depuis prospect_centres
    const { data, error: fetchError } = await supabase
      .from('prospect_centres')
      .select(`
        is_primary,
        linked_via,
        linked_at,
        centre:centres_auditifs (
          id, slug, nom, enseigne, raison_sociale, adresse, cp, ville,
          departement, tel, email, site_web, siret, finess, audio_nom,
          audio_prenom, photo_url, a_propos, specialites, marques, plan,
          claim_status, claimed_by_email, claimed_by_adeli,
          claimed_by_name, claimed_at
        )
      `)
      .eq('prospect_id', prospect_id)
      .order('is_primary', { ascending: false })
      .order('linked_at', { ascending: true });

    if (fetchError) {
      console.error('[list centres]', fetchError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const centres: LinkedCentre[] = (data ?? [])
      .map((row) => {
        // PostgREST embed retourne centre comme objet ou array selon la relation
        const centre = Array.isArray(row.centre) ? row.centre[0] : row.centre;
        if (!centre) return null;
        return {
          ...(centre as CentreAuditif),
          is_primary: row.is_primary as boolean,
          linked_via: row.linked_via as 'manual' | 'auto_claim',
          linked_at: row.linked_at as string,
          completeness_pct: computeCompleteness(centre as CentreAuditif),
        };
      })
      .filter((c): c is LinkedCentre => c !== null);

    return new Response(
      JSON.stringify({ success: true, centres }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
