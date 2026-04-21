// ProspectCentresTab.tsx — onglet Centres du ProspectEditModal.
// Liste des centres liés + autocomplete pour ajouter + détach.

import { useEffect, useState } from 'react';
import Button from '../ui/react/Button';
import Skeleton from '../ui/react/Skeleton';
import LinkedCentreCard from './LinkedCentreCard';
import CentreAutocomplete from './CentreAutocomplete';
import type { LinkedCentre } from '../../../types/prospect';

interface Props {
  prospectId: string;
  onCountChange?: (n: number) => void;
}

export default function ProspectCentresTab({ prospectId, onCountChange }: Props) {
  const [centres, setCentres] = useState<LinkedCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  async function reload(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prospects/centres/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId }),
        signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      if (signal?.aborted) return;
      const list = (json.centres as LinkedCentre[]) ?? [];
      setCentres(list);
      onCountChange?.(list.length);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      if (!signal?.aborted) setError((e as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId]);

  async function handleLink(centreId: string) {
    try {
      const res = await fetch('/api/admin/prospects/centres/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectId,
          centre_id: centreId,
          // premier lié = primary auto
          set_primary: centres.length === 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setShowAutocomplete(false);
      await reload();
    } catch (e) {
      alert(`Lien impossible : ${(e as Error).message}`);
    }
  }

  async function handleUnlink(centreId: string) {
    if (!confirm('Détacher ce centre du prospect ?')) return;
    try {
      const res = await fetch('/api/admin/prospects/centres/unlink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId, centre_id: centreId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      await reload();
    } catch (e) {
      alert(`Détachement impossible : ${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-3 font-sans">
      {loading && (
        <div className="space-y-3" aria-label="Chargement des centres">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {error && <div className="text-sm text-[#B34444]">{error}</div>}

      {!loading && centres.length === 0 && (
        <div className="py-8 text-center text-[#6B7A90] font-sans">
          <svg
            className="w-10 h-10 mx-auto mb-2 text-[#E4DED3]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
          </svg>
          <p className="text-sm italic">
            Aucun centre lié. Utilise « + Ajouter un centre » ci-dessous.
          </p>
        </div>
      )}

      {centres.map((c) => (
        <LinkedCentreCard
          key={c.id}
          centre={c}
          onUnlink={() => handleUnlink(c.id)}
        />
      ))}

      {!showAutocomplete ? (
        <Button variant="ghost" onClick={() => setShowAutocomplete(true)}>
          + Ajouter un centre
        </Button>
      ) : (
        <CentreAutocomplete
          prospectId={prospectId}
          onSelect={handleLink}
          onCancel={() => setShowAutocomplete(false)}
        />
      )}
    </div>
  );
}
