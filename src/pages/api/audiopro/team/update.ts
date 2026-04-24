export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../../lib/supabase';

// Update partiel d'une ligne centre_audios.
// Champs éditables : photo_url, bio, annee_dip, associations[], specialite, ordre.
// Champs immuables : rpps, prenom, nom, role, centre_id (identité officielle
// RPPS, préservée depuis rpps_audioprothesistes).

const VALID_SPECIALITES = new Set([
  'acouphenes', 'pediatrie', 'implants', '100_sante',
  'presbyacousie', 'hyperacousie', 'protection', 'autre',
]);

const FORBIDDEN_TERMS = [
  /\bgu[ée]rir\b/i,
  /\b[ée]liminer\b/i,
  /\bmiracle\b/i,
  /\bmiraculeux\b/i,
  /\b100\s*%\s*efficace\b/i,
  /\bd[ée]finitif\b/i,
  /\bpermanent\b/i,
  /\btraitement\b/i,
  /\btherapie\b/i,
  /\bth[ée]rapeutique\b/i,
  /\bsoigner\b/i,
];
const PRICE_RE = /\b\d{2,5}\s*(€|euros?|EUR)\b/i;

const MAX_BIO = 400;

function validateBio(v: string): string | null {
  const txt = v.trim();
  if (txt.length > MAX_BIO) return `Bio trop longue (${MAX_BIO} caractères maximum).`;
  for (const re of FORBIDDEN_TERMS) {
    if (re.test(txt)) {
      return 'Bio contient un terme interdit (promesse thérapeutique non autorisée en YMYL).';
    }
  }
  if (PRICE_RE.test(txt)) {
    return 'Pas de prix exact dans la bio.';
  }
  return null;
}

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

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { audioId, photo_url, bio, annee_dip, associations, specialite, ordre } = body as {
      audioId?: string;
      photo_url?: string | null;
      bio?: string | null;
      annee_dip?: number | null;
      associations?: string[];
      specialite?: string | null;
      ordre?: number;
    };

    if (!audioId) return json({ error: 'audioId requis.' }, 400);

    if (specialite !== undefined && specialite !== null && !VALID_SPECIALITES.has(specialite)) {
      return json({ error: 'Spécialité invalide.' }, 400);
    }
    if (bio !== undefined && bio !== null) {
      const bioError = validateBio(bio);
      if (bioError) return json({ error: bioError }, 400);
    }
    if (annee_dip !== undefined && annee_dip !== null) {
      const year = new Date().getFullYear();
      if (annee_dip < 1960 || annee_dip > year) {
        return json({ error: `Année de diplôme invalide (1960-${year}).` }, 400);
      }
    }

    const supabase = createServerClient();

    // Ownership check : on charge le centre via la ligne centre_audios + jointure
    const { data: audioRow } = await supabase
      .from('centre_audios')
      .select('id, centre_id, centres_auditifs!inner(claimed_by_email, claim_status, plan)')
      .eq('id', audioId)
      .single();
    if (!audioRow) return json({ error: 'Audioprothésiste introuvable.' }, 404);

    const centre = (audioRow as unknown as {
      centres_auditifs: { claimed_by_email: string; claim_status: string; plan: string };
    }).centres_auditifs;
    if (
      centre.claimed_by_email?.trim().toLowerCase() !== user.email.trim().toLowerCase() ||
      centre.claim_status !== 'approved'
    ) {
      return json({ error: 'Non autorisé.' }, 403);
    }
    if (centre.plan !== 'premium') {
      return json({ error: 'L\'équipe est réservée aux centres Premium.' }, 403);
    }

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (photo_url !== undefined) update.photo_url = photo_url;
    if (bio !== undefined) update.bio = bio === null ? null : bio.trim();
    if (annee_dip !== undefined) update.annee_dip = annee_dip;
    if (associations !== undefined) update.associations = associations;
    if (specialite !== undefined) update.specialite = specialite;
    if (ordre !== undefined) update.ordre = ordre;

    const { error } = await supabase
      .from('centre_audios')
      .update(update)
      .eq('id', audioId);

    if (error) {
      console.error('[team/update]', error.message);
      return json({ error: 'Mise à jour impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur serveur.';
    return json({ error: msg }, 500);
  }
};
