export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '../../../lib/supabase';
import {
  ACTIVE_CENTRE_COOKIE,
  ACTIVE_CENTRE_MAX_AGE,
} from '../../../lib/audiopro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Session invalide.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as { slug?: unknown };
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'slug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Vérification stricte : ce centre doit appartenir au user connecté.
    const supabase = createServerClient();
    const { data: centre } = await supabase
      .from('centres_auditifs')
      .select('slug, claimed_by_email, claim_status')
      .eq('slug', slug)
      .single();

    const ownerEmail = (centre?.claimed_by_email ?? '').trim().toLowerCase();
    const userEmail = user.email.trim().toLowerCase();
    if (
      !centre ||
      centre.claim_status !== 'approved' ||
      ownerEmail !== userEmail
    ) {
      return new Response(
        JSON.stringify({ error: 'Centre non autorisé.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    cookies.set(ACTIVE_CENTRE_COOKIE, slug, {
      path: '/',
      maxAge: ACTIVE_CENTRE_MAX_AGE,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      httpOnly: false,
    });

    return new Response(
      JSON.stringify({ success: true, slug }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
