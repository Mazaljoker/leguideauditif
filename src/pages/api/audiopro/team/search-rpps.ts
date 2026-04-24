export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';

// Recherche d'audioprothésistes dans rpps_audioprothesistes par nom partiel
// ou département. Utilisé par TeamManager.astro pour peupler le dialog
// "+ Ajouter un collaborateur". Auth requise (éviter scraping du répertoire).
//
// GET /api/audiopro/team/search-rpps?q=athuil&cp=75008
// Retourne les 10 meilleurs matches ordonnés par priorité département.

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

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const q = url.searchParams.get('q')?.trim() ?? '';
    const cp = url.searchParams.get('cp')?.trim() ?? '';

    if (q.length < 2) return json({ candidates: [] });

    const supabase = createServerClient();

    // Match sur nom OU prénom (case-insensitive, via ILIKE %q%).
    const { data } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps, civilite, nom, prenom, code_postal, commune, raison_sociale, enseigne, departement_code')
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
      .limit(30);

    const depCode = cp.substring(0, 2);
    // Priorise les matches du même département
    const ranked = (data ?? []).sort((a, b) => {
      const sameDepA = (a as { departement_code?: string }).departement_code === depCode ? 0 : 1;
      const sameDepB = (b as { departement_code?: string }).departement_code === depCode ? 0 : 1;
      return sameDepA - sameDepB;
    });

    return json({ candidates: ranked.slice(0, 10) });
  } catch (err) {
    console.error('[team/search-rpps]', err);
    return json({ error: 'Erreur serveur.' }, 500);
  }
};
