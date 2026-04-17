// Layer 2 du tracking : JS client. Couvre les pages STATIQUES (qui ne passent
// pas par le middleware Astro) et sert de fallback pour les cas où la Vercel
// Routing Middleware ne se déclenche pas (caches, previews).
//
// Lit et écrit le MÊME cookie que le middleware (src/middleware.ts) —
// aucune duplication de données, first-touch partagé entre serveur et client.

import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  buildAttribution,
  hasAttributionSignal,
  parseAttribution as parseAttr,
  serializeAttribution,
  shouldOverwrite,
  type Attribution,
} from './attribution';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? match[2] : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

// Capture l'attribution côté client pour les pages statiques (middleware ne tourne pas).
// Idempotent : respecte la règle first-touch (pas d'écrasement sauf upgrade direct→UTM).
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const hasSignal = hasAttributionSignal(params) || !!document.referrer;
  const existing = parseAttr(readCookie(ATTRIBUTION_COOKIE));

  if (existing && !hasSignal) return;

  const incoming = buildAttribution(
    params,
    document.referrer || null,
    window.location.pathname,
    window.location.hostname,
  );

  if (!existing || shouldOverwrite(existing, incoming)) {
    writeCookie(ATTRIBUTION_COOKIE, serializeAttribution(incoming), ATTRIBUTION_MAX_AGE_SECONDS);
  }
}

export function readAttribution(): Attribution | null {
  return parseAttr(readCookie(ATTRIBUTION_COOKIE));
}

// Lit le client_id GA4 depuis le cookie _ga.
// Format : GA1.2.1234567890.1700000000 → retourne "1234567890.1700000000".
export function getGaClientId(): string | null {
  const raw = readCookie('_ga');
  if (!raw) return null;
  const match = raw.match(/^GA\d\.\d\.(\d+\.\d+)$/);
  return match ? match[1] : null;
}

// Lit le session_id GA4 depuis le cookie _ga_<MEASUREMENT_ID>.
// Format observé : GS2.1.s1776420931$o2$g1$t... — le session_id est préfixé
// par "s" dans les versions récentes de GA4 (octobre 2025+).
export function getGaSessionId(measurementId: string): string | null {
  const containerId = measurementId.replace(/^G-/, '');
  const raw = readCookie(`_ga_${containerId}`);
  if (!raw) return null;
  const match = raw.match(/^GS\d\.\d\.s?(\d+)/);
  return match ? match[1] : null;
}
