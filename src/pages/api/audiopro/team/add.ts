export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';
import { MAX_TEAM_SIZE } from '../../../../types/centre-team';

// Ajoute un collaborateur à l'équipe d'un centre Premium.
//   - Ownership : claim owner + plan=premium
//   - Anti-forge : rpps doit exister dans rpps_audioprothesistes
//   - Limite : MAX_TEAM_SIZE (10) collaborateurs par centre
//   - role = 'collaborateur' forcé (titulaire créé uniquement par backfill)

const VALID_SPECIALITES = new Set([
  'acouphenes', 'pediatrie', 'implants', '100_sante',
  'presbyacousie', 'hyperacousie', 'protection', 'autre',
]);

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

async function assertPremiumOwner(email: string, centreSlug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('centres_auditifs')
    .select('id, claimed_by_email, claim_status, plan')
    .eq('slug', centreSlug)
    .single();
  if (!data) throw new Error('Centre introuvable.');
  if (
    data.claimed_by_email?.trim().toLowerCase() !== email.trim().toLowerCase() ||
    data.claim_status !== 'approved'
  ) {
    throw new Error('Non autorisé.');
  }
  if (data.plan !== 'premium') {
    throw new Error('L\'équipe est réservée aux centres Premium.');
  }
  return data.id as string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { centreSlug, rpps, specialite } = body as {
      centreSlug?: string;
      rpps?: string;
      specialite?: string;
    };

    if (!centreSlug || !rpps) return json({ error: 'centreSlug + rpps requis.' }, 400);
    const rppsClean = String(rpps).trim();
    if (!/^\d{11}$/.test(rppsClean)) {
      return json({ error: 'RPPS invalide (11 chiffres attendus).' }, 400);
    }
    if (specialite && !VALID_SPECIALITES.has(specialite)) {
      return json({ error: 'Spécialité invalide.' }, 400);
    }

    const centreId = await assertPremiumOwner(user.email, centreSlug);
    const supabase = createServerClient();

    const { data: directoryRow } = await supabase
      .from('rpps_audioprothesistes')
      .select('rpps, prenom, nom')
      .eq('rpps', rppsClean)
      .maybeSingle();
    if (!directoryRow) {
      return json({ error: 'RPPS introuvable dans l\'annuaire officiel.' }, 400);
    }

    const { count } = await supabase
      .from('centre_audios')
      .select('*', { count: 'exact', head: true })
      .eq('centre_id', centreId);
    if ((count ?? 0) >= MAX_TEAM_SIZE) {
      return json(
        { error: `Limite de ${MAX_TEAM_SIZE} audioprothésistes par centre atteinte.` },
        400,
      );
    }

    const { data: ordreRow } = await supabase
      .from('centre_audios')
      .select('ordre')
      .eq('centre_id', centreId)
      .order('ordre', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrdre = (ordreRow?.ordre ?? 0) + 1;

    const { data, error } = await supabase
      .from('centre_audios')
      .insert({
        centre_id: centreId,
        rpps: rppsClean,
        prenom: directoryRow.prenom,
        nom: directoryRow.nom,
        role: 'collaborateur',
        ordre: nextOrdre,
        specialite: specialite ?? null,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation (déjà dans l'équipe)
      if (error.code === '23505') {
        return json({ error: 'Cet audioprothésiste est déjà dans l\'équipe.' }, 400);
      }
      console.error('[team/add]', error.message);
      return json({ error: 'Ajout impossible.' }, 500);
    }

    return json({ success: true, audio: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur.';
    const status = msg === 'Non autorisé.' ? 403 : msg.includes('réservée') ? 403 : 500;
    return json({ error: msg }, status);
  }
};
