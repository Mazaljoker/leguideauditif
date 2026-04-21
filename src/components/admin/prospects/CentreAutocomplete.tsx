// CentreAutocomplete.tsx — input + dropdown pour lier un centre à un prospect.
// Debounce 200ms, min 2 caractères. ILIKE sur nom/ville/cp.

import { useEffect, useState } from 'react';
import Button from '../ui/react/Button';
import type { CentreSearchResult } from '../../../types/prospect';

interface Props {
  prospectId: string;
  onSelect: (centreId: string) => void;
  onCancel: () => void;
}

export default function CentreAutocomplete({ prospectId, onSelect, onCancel }: Props) {
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<CentreSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 200);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch('/api/admin/prospects/centres/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: debounced.trim(), prospect_id: prospectId }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
        if (!cancelled) setResults((json.centres as CentreSearchResult[]) ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, prospectId]);

  return (
    <div className="border border-[#E4DED3] rounded-lg bg-white p-3 font-sans">
      <div className="flex gap-2 mb-2">
        <input
          autoFocus
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Rechercher un centre par nom, ville ou CP…"
          className="flex-1 border border-[#E4DED3] rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97B3D]"
          aria-label="Rechercher un centre"
        />
        <Button variant="cancel" onClick={onCancel}>
          Annuler
        </Button>
      </div>

      {error && <div className="text-xs text-[#B34444] py-2">{error}</div>}
      {loading && <div className="text-xs text-[#6B7A90] py-2">Recherche…</div>}

      {debounced.trim().length < 2 && (
        <div className="text-xs text-[#6B7A90] py-2 italic">
          Tape au moins 2 caractères…
        </div>
      )}

      {debounced.trim().length >= 2 && !loading && !error && results.length === 0 && (
        <div className="text-xs text-[#6B7A90] py-2 italic">
          Aucun résultat pour « {debounced.trim()} »
        </div>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-[#E4DED3] max-h-60 overflow-y-auto">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className="w-full text-left px-2 py-2 hover:bg-[#F8F5F0] rounded"
              >
                <div className="font-medium text-sm text-[#1B2E4A]">{c.nom}</div>
                <div className="text-xs text-[#6B7A90]">
                  {[c.ville, c.cp].filter(Boolean).join(' · ')}
                  {(c.audio_prenom || c.audio_nom) && (
                    <> — {[c.audio_prenom, c.audio_nom].filter(Boolean).join(' ')}</>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
