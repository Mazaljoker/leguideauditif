// Logique d'attribution partagée par les 3 couches de tracking :
// 1. Middleware Astro (src/middleware.ts) — SSR pages
// 2. JS client (src/lib/tracking.ts) — toutes pages, fallback
// 3. Vercel Routing Middleware (racine) — edge, toutes requêtes

export type Attribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  msclkid: string | null;
  referrer: string | null;
  landing_page: string | null;
  captured_at: string;
};

export const ATTRIBUTION_COOKIE = 'lga_attr';
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 jours

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const CLICK_ID_KEYS = ['gclid', 'fbclid', 'msclkid'] as const;

export function isExternalReferrer(referrer: string | null, currentHost: string): boolean {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname;
    return host !== currentHost;
  } catch {
    return false;
  }
}

export function hasAttributionSignal(params: URLSearchParams): boolean {
  return UTM_KEYS.some((k) => params.get(k)) || CLICK_ID_KEYS.some((k) => params.get(k));
}

export function buildAttribution(
  params: URLSearchParams,
  referrer: string | null,
  pathname: string,
  currentHost: string,
): Attribution {
  const externalRef = isExternalReferrer(referrer, currentHost);
  return {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_term: params.get('utm_term'),
    utm_content: params.get('utm_content'),
    gclid: params.get('gclid'),
    fbclid: params.get('fbclid'),
    msclkid: params.get('msclkid'),
    referrer: externalRef ? referrer : null,
    landing_page: pathname,
    captured_at: new Date().toISOString(),
  };
}

// First-touch avec upgrade : on garde la première attribution, SAUF si elle était
// "direct/vide" et qu'une nouvelle visite apporte un signal UTM — auquel cas on
// met à jour (une campagne identifiée vaut mieux qu'un "direct" par défaut).
export function shouldOverwrite(existing: Attribution | null, incoming: Attribution): boolean {
  if (!existing) return true;
  const existingHasSignal =
    existing.utm_source || existing.gclid || existing.fbclid || existing.msclkid || existing.referrer;
  const incomingHasSignal =
    incoming.utm_source || incoming.gclid || incoming.fbclid || incoming.msclkid || incoming.referrer;
  return !existingHasSignal && !!incomingHasSignal;
}

export function parseAttribution(raw: string | null | undefined): Attribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<Attribution>;
    return {
      utm_source: parsed.utm_source ?? null,
      utm_medium: parsed.utm_medium ?? null,
      utm_campaign: parsed.utm_campaign ?? null,
      utm_term: parsed.utm_term ?? null,
      utm_content: parsed.utm_content ?? null,
      gclid: parsed.gclid ?? null,
      fbclid: parsed.fbclid ?? null,
      msclkid: parsed.msclkid ?? null,
      referrer: parsed.referrer ?? null,
      landing_page: parsed.landing_page ?? null,
      captured_at: parsed.captured_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function serializeAttribution(attr: Attribution): string {
  return encodeURIComponent(JSON.stringify(attr));
}
