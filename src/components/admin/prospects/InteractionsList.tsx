// InteractionsList.tsx — historique des interactions d'un prospect (read-only).
// Fetch lazy à l'ouverture du panel. reloadKey force un refetch.

import { useEffect, useState } from 'react';
import Skeleton from '../ui/react/Skeleton';
import {
  INTERACTION_KIND_LABELS,
  type Interaction,
} from '../../../types/prospect';

interface Props {
  prospectId: string;
  reloadKey?: number;
}

function formatOccurredAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const datePart = d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${datePart} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InteractionsList({ prospectId, reloadKey = 0 }: Props) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch('/api/admin/prospects/interactions/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect_id: prospectId }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
        if (!controller.signal.aborted) {
          setInteractions((json.interactions as Interaction[]) ?? []);
        }
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [prospectId, reloadKey]);

  if (loading) {
    return (
      <div className="space-y-2 py-2" aria-label="Chargement de l'historique">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-11/12" />
        <Skeleton className="h-10 w-10/12" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-[#B34444] font-sans py-2">{error}</div>
    );
  }

  if (interactions.length === 0) {
    return (
      <div className="text-sm text-[#6B7A90] italic font-sans py-2">
        Aucune interaction enregistrée.
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E4DED3] rounded-md p-3 max-h-[160px] overflow-y-auto text-sm text-[#6B7A90] font-sans">
      {interactions.map((i) => (
        <div key={i.id} className="border-b border-dashed border-[#E4DED3] py-1.5 last:border-b-0">
          <div className="text-[#1B2E4A] font-semibold text-[11px] mb-0.5">
            {formatOccurredAt(i.occurred_at)} · {INTERACTION_KIND_LABELS[i.kind]}
          </div>
          <div>{i.content}</div>
        </div>
      ))}
    </div>
  );
}
