export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';
import { TEMPLATES, type TemplateKey } from '../../../lib/actualites-templates';

// CRUD actualites du centre — validation YMYL serveur.

const FORBIDDEN_TERMS = [
  /\bgu[ée]rir\b/i,
  /\b[ée]liminer\b/i,
  /\bmiracle\b/i,
  /\bmiraculeux\b/i,
  /\b100\s*%\s*efficace\b/i,
  /\bd[ée]finitif\b/i,
  /\btraitement\b/i,
  /\bth[ée]rapie\b/i,
  /\bth[ée]rapeutique\b/i,
  /\bsoigner\b/i,
];

const PRICE_RE = /\b\d{2,5}\s*(€|euros?|EUR)\b/i;

function validateContent(title: string, body: string): string | null {
  if (!title || title.trim().length < 5) return 'Titre trop court (5 caractères minimum).';
  if (title.length > 150) return 'Titre trop long (150 caractères maximum).';
  if (!body || body.trim().length < 20) return 'Corps trop court (20 caractères minimum).';
  if (body.length > 1000) return 'Corps trop long (1000 caractères maximum).';
  const full = `${title} ${body}`;
  for (const re of FORBIDDEN_TERMS) {
    if (re.test(full)) return 'Terme interdit détecté (promesse thérapeutique non autorisée en YMYL).';
  }
  if (PRICE_RE.test(full)) {
    return 'Pas de prix exact dans les actualités (utilisez "Classe 1", "Classe 2" ou "100% Santé" / "reste à charge 0€").';
  }
  return null;
}

async function assertOwner(email: string, centreSlug: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('centres_auditifs')
    .select('id, nom, claimed_by_email, claim_status, plan')
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
  return { id: data.id as string, nom: data.nom as string };
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

function renderActualite(
  template: TemplateKey,
  variables: Record<string, string>,
  centreNom: string,
): { title: string; body: string } {
  const def = TEMPLATES[template];
  if (!def) throw new Error('Template inconnu.');
  return def.render(variables, centreNom);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { centreSlug, template, variables } = body as {
      centreSlug?: string;
      template?: TemplateKey;
      variables?: Record<string, string>;
    };

    if (!centreSlug || !template) return json({ error: 'centreSlug + template requis.' }, 400);
    if (!(template in TEMPLATES)) return json({ error: 'Template inconnu.' }, 400);

    const centre = await assertOwner(user.email, centreSlug);
    const rendered = renderActualite(template, variables ?? {}, centre.nom);
    const err = validateContent(rendered.title, rendered.body);
    if (err) return json({ error: err }, 400);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('centre_actualites')
      .insert({
        centre_id: centre.id,
        template,
        title: rendered.title,
        body: rendered.body,
        variables: variables ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error('[actualite POST]', error.message);
      return json({ error: 'Création impossible.' }, 500);
    }

    return json({ success: true, actualite: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    const status = msg === 'Non autorisé.' || msg.includes('Premium') ? 403 : 500;
    return json({ error: msg }, status);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { id, centreSlug, template, variables } = body as {
      id?: string;
      centreSlug?: string;
      template?: TemplateKey;
      variables?: Record<string, string>;
    };
    if (!id || !centreSlug || !template) return json({ error: 'id + centreSlug + template requis.' }, 400);

    const centre = await assertOwner(user.email, centreSlug);
    const rendered = renderActualite(template, variables ?? {}, centre.nom);
    const err = validateContent(rendered.title, rendered.body);
    if (err) return json({ error: err }, 400);

    const supabase = createServerClient();
    const { error } = await supabase
      .from('centre_actualites')
      .update({
        template,
        title: rendered.title,
        body: rendered.body,
        variables: variables ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('centre_id', centre.id);

    if (error) {
      console.error('[actualite PUT]', error.message);
      return json({ error: 'Mise à jour impossible.' }, 500);
    }
    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    const status = msg === 'Non autorisé.' || msg.includes('Premium') ? 403 : 500;
    return json({ error: msg }, status);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await authUser(cookies);
    if (!user || !user.email) return json({ error: 'Non autorisé.' }, 401);

    const body = await request.json();
    const { id, centreSlug } = body as { id?: string; centreSlug?: string };
    if (!id || !centreSlug) return json({ error: 'id + centreSlug requis.' }, 400);

    const centre = await assertOwner(user.email, centreSlug);

    const supabase = createServerClient();
    const { error } = await supabase
      .from('centre_actualites')
      .delete()
      .eq('id', id)
      .eq('centre_id', centre.id);

    if (error) {
      console.error('[actualite DELETE]', error.message);
      return json({ error: 'Suppression impossible.' }, 500);
    }
    return json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue.';
    const status = msg === 'Non autorisé.' || msg.includes('Premium') ? 403 : 500;
    return json({ error: msg }, status);
  }
};
