// TaskOwnerAutocomplete.tsx — sélecteur d'owner (prospect/contact/centre).
// Debounce 200ms, min 2 caractères. POST /api/admin/tasks/search-owners.

import { useEffect, useState } from 'react';
import type { TaskOwnerType } from '../../../types/task';

interface OwnerResult {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  ownerType: TaskOwnerType;
  currentLabel?: string | null;
  onSelect: (ownerId: string, label: string) => void;
}

export default function TaskOwnerAutocomplete({
  ownerType,
  currentLabel,
  onSelect,
}: Props) {
  const [input, setInput] = useState(currentLabel ?? '');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<OwnerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

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

    fetch('/api/admin/tasks/search-owners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: debounced.trim(), owner_type: ownerType }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
        if (!cancelled) setResults((json.results as OwnerResult[]) ?? []);
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
  }, [debounced, ownerType]);

  function handleSelect(r: OwnerResult) {
    setInput(r.label);
    setShowDropdown(false);
    onSelect(r.id, r.label);
  }

  return (
    <div className="relative font-sans">
      <input
        type="search"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={`Rechercher un ${ownerType}…`}
        className="w-full border border-[#E4DED3] bg-white px-2.5 py-2 rounded-md text-sm text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
        aria-label={`Rechercher un ${ownerType}`}
      />

      {showDropdown && debounced.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E4DED3] rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
          {loading && (
            <div className="text-xs text-[#6B7A90] px-3 py-2">Recherche…</div>
          )}
          {error && <div className="text-xs text-[#B34444] px-3 py-2">{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div className="text-xs text-[#6B7A90] px-3 py-2 italic">
              Aucun résultat pour « {debounced.trim()} »
            </div>
          )}
          {results.length > 0 && (
            <ul className="divide-y divide-[#E4DED3]">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="w-full text-left px-3 py-2 hover:bg-[#F8F5F0]"
                  >
                    <div className="font-medium text-sm text-[#1B2E4A]">{r.label}</div>
                    {r.sublabel && (
                      <div className="text-xs text-[#6B7A90]">{r.sublabel}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
