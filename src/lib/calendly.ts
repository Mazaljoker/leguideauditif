// Helper Calendly pour l'espace pro audioprothésiste.
//
// Une seule URL de réservation (présentation 30 min Franck-Olivier),
// déclinée par UTM `utm_content` selon le contexte (hero, card,
// sidebar pin, locked banner). Tous les CTAs `<BookCallButton />`
// passent par `buildCalendlyUrl(source)` pour rester traçables côté
// GA4 sans réécrire les UTM à la main.

export const CALENDLY_BASE_URL =
  'https://calendly.com/franckolivier-leguideauditif/presentation-le-guide-auditif-pro';

const FIXED_UTM = {
  utm_source: 'espace-pro',
  utm_medium: 'app',
  utm_campaign: 'lga-pro-rdv',
} as const;

export function buildCalendlyUrl(source: string): string {
  const params = new URLSearchParams({
    ...FIXED_UTM,
    utm_content: source,
  });
  return `${CALENDLY_BASE_URL}?${params.toString()}`;
}

export interface CalendlyPrefill {
  name?: string;
  email?: string;
}
