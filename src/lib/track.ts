// Wrapper analytics minimal pour les événements espace pro.
//
// gtag est gaté par tarteaucitron (cookie `!gtag=true`). Si l'audio
// n'a pas accepté, `window.gtag` n'existe pas et on no-op proprement.
// Pas d'erreur, pas de log — comportement attendu côté CNIL.

export type BookCallPhase = 'initiated' | 'completed';

export interface BookCallPayload {
  source: string;
  centreId?: string;
  plan?: 'standard' | 'premium' | 'fondateur';
}

export function trackBookCall(phase: BookCallPhase, payload: BookCallPayload): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', `book_call_${phase}`, {
    source: payload.source,
    centre_id: payload.centreId ?? null,
    plan: payload.plan ?? null,
  });
}
