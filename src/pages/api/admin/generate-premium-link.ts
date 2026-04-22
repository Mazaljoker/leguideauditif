export const prerender = false;

import type { APIRoute } from 'astro';
import { generateAdminToken } from '../../../lib/admin-token';

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
    const { centreSlug } = body;

    if (!centreSlug) {
      return new Response(
        JSON.stringify({ error: 'centreSlug requis.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = await generateAdminToken('premium', centreSlug);
    const link = `https://leguideauditif.fr/api/admin/upgrade-premium?slug=${centreSlug}&token=${token}`;

    return new Response(
      JSON.stringify({ success: true, link }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
