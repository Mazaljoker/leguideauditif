// GA4 Measurement Protocol — envoi serveur-à-serveur d'événements de conversion.
// Docs : https://developers.google.com/analytics/devguides/collection/protocol/ga4

import { randomUUID } from 'node:crypto';

type MpEventParams = Record<string, string | number | boolean | null | undefined>;

type MpEvent = {
  name: string;
  params?: MpEventParams;
};

type SendMpEventInput = {
  clientId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
  events: MpEvent[];
  userIpAddress?: string | null;
  userAgent?: string | null;
};

const ENDPOINT = 'https://www.google-analytics.com/mp/collect';

function cleanParams(params?: MpEventParams): MpEventParams {
  if (!params) return {};
  const out: MpEventParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    out[k] = v;
  }
  return out;
}

// Envoie un lot d'événements via le Measurement Protocol GA4.
// Retourne true si l'appel a réussi (2xx). N'échoue jamais silencieusement —
// les erreurs sont loggées pour investigation mais ne remontent pas à l'appelant.
export async function sendMpEvent({
  clientId,
  sessionId,
  userId,
  events,
  userIpAddress,
  userAgent,
}: SendMpEventInput): Promise<boolean> {
  const measurementId = import.meta.env.GA4_MEASUREMENT_ID;
  const apiSecret = import.meta.env.GA4_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn('GA4 MP: GA4_MEASUREMENT_ID ou GA4_API_SECRET manquant — event non envoyé');
    return false;
  }

  const effectiveClientId = clientId || `server.${randomUUID()}`;

  const body = {
    client_id: effectiveClientId,
    ...(userId ? { user_id: userId } : {}),
    ...(userIpAddress ? { ip_override: userIpAddress } : {}),
    ...(userAgent ? { user_agent: userAgent } : {}),
    events: events.map((ev) => {
      const params = cleanParams(ev.params);
      // session_id et engagement_time_msec sont requis pour que GA4 rattache l'event
      // à une session et ne le marque pas comme "engagement inférieur à la seconde".
      if (sessionId) params.session_id = sessionId;
      if (!('engagement_time_msec' in params)) params.engagement_time_msec = 1;
      if (!clientId) params.server_only = true;
      return { name: ev.name, params };
    }),
  };

  const url = `${ENDPOINT}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`GA4 MP: HTTP ${res.status} — ${await res.text().catch(() => '')}`);
      return false;
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GA4 MP: fetch failed —', msg);
    return false;
  }
}
