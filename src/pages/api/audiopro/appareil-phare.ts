export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';

// CRUD des appareils phares du centre.
//   - POST : crée un appareil (limite 6 par centre)
//   - PUT  : met à jour (id requis)
//   - DELETE : supprime (id requis)
//
// Validation :
//   - ownership obligatoire (centre claimed_by_email == user.email + approved)
//   - verdict : 20-250 chars + regex anti-promesse-thérapeutique + anti-prix
//   - marque, modèle : requis non vides
//   - max 6 appareils par centre (contrainte DB + check applicatif)

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

function validateVerdict(v: string): string | null {
  const txt = v.trim();
  if (txt.length < 20) return 'Verdict trop court (20 caractères minimum).';
  if (txt.length > 250) return 'Verdict trop long (250 caractères maximum).';
  for (const re of FORBIDDEN_TERMS) {
    if (re.test(txt)) {
      return `Le verdict contient un terme interdit (promesse thérapeutique non autorisée en YMYL).`;
    }
  }
  if (PRICE_RE.test(txt)) {
    return 'Pas de prix exact dans le verdict (utilisez "Classe 1", "Classe 2" ou "fourchette standard").';
  }
  return null;
}

async function assertOwner(email: string, centreSlug: string) {
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
    throw new Error('Feature réservée aux centres Premium.');
  }
  return data.id as string;
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { centreSlug, marque, modele, classe, type_appareil, verdict_audio, ordre, produit_slug } = body;

    if (!centreSlug || !marque || !modele || !verdict_audio) {
      return json({ error: 'Champs manquants (centreSlug, marque, modele, verdict_audio requis).' }, 400);
    }

    const verdictError = validateVerdict(verdict_audio);
    if (verdictError) return json({ error: verdictError }, 400);

    const centreId = await assertOwner(user.email, centreSlug);

    const supabase = createServerClient();

    // Max 6 appareils par centre
    const { count } = await supabase
      .from('centre_appareils_phares')
      .select('*', { count: 'exact', head: true })
      .eq('centre_id', centreId);
    if ((count ?? 0) >= 6) {
      return json({ error: 'Limite de 6 appareils phares atteinte. Retirez-en un avant d\'ajouter.' }, 400);
    }

    const { data, error } = await supabase
      .from('centre_appareils_phares')
      .insert({
        centre_id: centreId,
        marque: marque.trim(),
        modele: modele.trim(),
        classe: classe ?? 'tous',
        type_appareil: type_appareil ?? 'RITE',
        verdict_audio: verdict_audio.trim(),
        produit_slug: typeof produit_slug === 'string' && produit_slug.trim().length > 0 ? produit_slug.trim() : null,
        ordre: typeof ordre === 'number' ? ordre : (count ?? 0) + 1,
      })
      .select()
      .single();

    if (error) {
      console.error('[appareil-phare POST]', error.message);
      return json({ error: 'Création impossible.' }, 500);
    }

    return json({ success: true, appareil: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    return json({ error: msg }, msg === 'Non autorisé.' ? 403 : 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { id, centreSlug, marque, modele, classe, type_appareil, verdict_audio, ordre, produit_slug } = body;

    if (!id || !centreSlug) return json({ error: 'id + centreSlug requis.' }, 400);

    if (verdict_audio) {
      const verdictError = validateVerdict(verdict_audio);
      if (verdictError) return json({ error: verdictError }, 400);
    }

    const centreId = await assertOwner(user.email, centreSlug);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (marque !== undefined) update.marque = String(marque).trim();
    if (modele !== undefined) update.modele = String(modele).trim();
    if (classe !== undefined) update.classe = classe;
    if (type_appareil !== undefined) update.type_appareil = type_appareil;
    if (verdict_audio !== undefined) update.verdict_audio = String(verdict_audio).trim();
    if (ordre !== undefined) update.ordre = ordre;
    if (produit_slug !== undefined) {
      update.produit_slug = typeof produit_slug === 'string' && produit_slug.trim().length > 0
        ? produit_slug.trim()
        : null;
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('centre_appareils_phares')
      .update(update)
      .eq('id', id)
      .eq('centre_id', centreId);

    if (error) {
      console.error('[appareil-phare PUT]', error.message);
      return json({ error: 'Mise à jour impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    return json({ error: msg }, msg === 'Non autorisé.' ? 403 : 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { id, centreSlug } = body;
    if (!id || !centreSlug) return json({ error: 'id + centreSlug requis.' }, 400);

    const centreId = await assertOwner(user.email, centreSlug);

    const supabase = createServerClient();
    const { error } = await supabase
      .from('centre_appareils_phares')
      .delete()
      .eq('id', id)
      .eq('centre_id', centreId);

    if (error) {
      console.error('[appareil-phare DELETE]', error.message);
      return json({ error: 'Suppression impossible.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    return json({ error: msg }, msg === 'Non autorisé.' ? 403 : 500);
  }
};
