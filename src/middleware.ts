import { defineMiddleware } from 'astro:middleware';
import { createClient } from '@supabase/supabase-js';
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  buildAttribution,
  hasAttributionSignal,
  parseAttribution,
  serializeAttribution,
  shouldOverwrite,
} from './lib/attribution';

export const onRequest = defineMiddleware(async (context, next) => {
  // ---------- Attribution capture (layer 1 : SSR pages) ----------
  // Écrit un cookie first-party 90 jours avec UTM / gclid / referer.
  // Les pages statiques ne passent pas ici — elles sont couvertes par le JS
  // client (BaseLayout) et la Vercel Routing Middleware.
  const acceptsHtml = context.request.headers.get('accept')?.includes('text/html');
  if (acceptsHtml) {
    const { searchParams, pathname, hostname } = context.url;
    const incoming = buildAttribution(
      searchParams,
      context.request.headers.get('referer'),
      pathname,
      hostname,
    );
    const existing = parseAttribution(context.cookies.get(ATTRIBUTION_COOKIE)?.value);
    const hasSignal = hasAttributionSignal(searchParams) || !!incoming.referrer;

    if (!existing || (hasSignal && shouldOverwrite(existing, incoming))) {
      context.cookies.set(ATTRIBUTION_COOKIE, serializeAttribution(incoming), {
        path: '/',
        maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
        sameSite: 'lax',
        secure: import.meta.env.PROD,
        httpOnly: false,
      });
    }
  }

  // ---------- Auth Supabase (existant) ----------
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
