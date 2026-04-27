// Opt-out tracking interne — admin uniquement.
// Set via /admin/no-track. Bloque les 3 niveaux : tarteaucitron service GA4,
// gtag client, Measurement Protocol serveur. N'affecte PAS le cookie d'attribution
// `lga_attr` (volontaire — permet de tester le funnel sans fausser les UTM).
//
// Cookie volontairement non-httpOnly pour debug DevTools (donnée non sensible).

import type { AstroCookies } from 'astro';

export const NO_TRACK_COOKIE = 'lga_no_track';
export const NO_TRACK_VALUE = '1';
// 10 ans — opt-out perçu comme permanent par l'utilisateur.
export const NO_TRACK_MAX_AGE_SECONDS = 10 * 365 * 24 * 60 * 60;

export function hasNoTrackCookie(cookies: AstroCookies): boolean {
  return cookies.get(NO_TRACK_COOKIE)?.value === NO_TRACK_VALUE;
}

export function hasNoTrackCookieClient(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((c) => c === `${NO_TRACK_COOKIE}=${NO_TRACK_VALUE}`);
}
