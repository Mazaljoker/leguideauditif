export const prerender = false;

// POST /api/auth/update-password
//   body: { password: string }
// Met à jour le mot de passe de l'utilisateur connecté via setSession.
// Min 8 caractères. Les utilisateurs connectés via magic link peuvent ainsi
// définir un mot de passe pour les prochaines connexions.

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const MIN_PASSWORD_LENGTH = 8;

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

    const body = (await request.json()) as { password?: unknown };
    const password = typeof body.password === 'string' ? body.password : '';

    if (password.length < MIN_PASSWORD_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    const authClient = createClient(supabaseUrl, supabaseAnonKey);

    // Restaurer la session puis updateUser — getSession/setSession est requis
    // pour que updateUser soit autorisé.
    const { data: sessionData, error: sessionError } = await authClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { error: updateError } = await authClient.auth.updateUser({ password });

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message || 'Mise à jour impossible.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'Erreur serveur.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
