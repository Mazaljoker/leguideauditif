export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

// Endpoint de validation/lien du N° RPPS depuis la suggestion
// automatique affichée sur /audioprothesiste-pro/fiche/.
//
// Flow :
//   1. Auth cookie Supabase (sb-access-token / sb-refresh-token)
//   2. Ownership : centre.claimed_by_email == user.email + approved
//   3. Le rpps soumis DOIT exister dans rpps_audioprothesistes (sinon
//      l'audio ne peut pas forger un numéro arbitraire)
//   4. UPDATE centres_auditifs SET rpps = ? WHERE id = ?

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function authUser(cookies: { get(name: string): { value?: string } | undefined }) {
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;
  if (!accessToken || !refreshToken) return null;
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user } } = await authClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return user;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const { centreSlug, rpps } = (await request.json()) as {
      centreSlug?: string;
      rpps?: string;
    };

    if (!centreSlug || !rpps) return json({ error: 'centreSlug + rpps requis.' }, 400);
    const rppsClean = String(rpps).trim();
    if (!/^\d{11}$/.test(rppsClean)) return json({ error: 'RPPS invalide (11 chiffres attendus).' }, 400);

    const supabase = createServerClient();

    // Vérifier que le rpps existe dans le répertoire RPPS officiel
    const { data: directoryRow } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps, nom, prenom')
      .eq('rpps', rppsClean)
      .maybeSingle();
    if (!directoryRow) {
      return json({ error: 'RPPS introuvable dans l\'annuaire officiel.' }, 400);
    }

    // Ownership check
    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('id, claimed_by_email, claim_status')
      .eq('slug', centreSlug)
      .single();
    if (!centre) return json({ error: 'Centre introuvable.' }, 404);
    if (
      centre.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }

    const { error } = await supabase
      .from('centres_auditifs')
      .update({ rpps: rppsClean, updated_at: new Date().toISOString() })
      .eq('id', centre.id);

    if (error) {
      console.error('[link-rpps] update error', error.message);
      return json({ error: 'Mise à jour impossible.' }, 500);
    }

    return json({
      success: true,
      rpps: rppsClean,
      directoryName: `${directoryRow.prenom} ${directoryRow.nom}`,
    });
  } catch (err) {
    console.error('[link-rpps] unexpected', err);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};
