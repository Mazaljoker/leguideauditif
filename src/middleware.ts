import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  // Extraire le token depuis le cookie sb-access-token ou le header Authorization
  const accessToken = context.cookies.get('sb-access-token')?.value;
  const refreshToken = context.cookies.get('sb-refresh-token')?.value;

  if (accessToken && refreshToken) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user } } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Rendre le user disponible dans Astro.locals
    context.locals.user = user;
  } else {
    context.locals.user = null;
  }

  return next();
});
