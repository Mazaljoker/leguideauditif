// ProspectCentresTab.tsx — onglet Centres du ProspectEditModal.
// Liste des centres liés + autocomplete pour ajouter + détach.

import { useEffect, useState } from 'react';
import Button from '../ui/react/Button';
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

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prospects/centres/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: prospectId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      const list = (json.centres as LinkedCentre[]) ?? [];
      setCentres(list);
      onCountChange?.(list.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
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
        <div className="text-sm text-[#6B7A90] italic">Chargement des centres…</div>
      )}
      {error && <div className="text-sm text-[#B34444]">{error}</div>}

      {!loading && centres.length === 0 && (
        <div className="py-6 text-center text-[#6B7A90] italic text-sm">
          Aucun centre lié pour l'instant. Clique « + Ajouter un centre » ci-dessous.
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
