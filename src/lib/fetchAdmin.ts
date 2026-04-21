// fetchAdmin — wrapper fetch avec gestion session expirée et JSON standard.
// Usage dans les composants admin pour centraliser la gestion 401.

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expirée. Reconnecte-toi.');
    this.name = 'SessionExpiredError';
  }
}

export async function fetchAdmin<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new SessionExpiredError();
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  if (!res.ok) {
    const errorMsg =
      (json as { error?: string })?.error ?? `Erreur ${res.status}`;
    throw new Error(errorMsg);
  }

  return json as T;
}
