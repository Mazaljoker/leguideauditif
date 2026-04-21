// ProspectHistoriqueTab.tsx — onglet Historique du ProspectEditModal.
// Search full-text (RPC search_prospect_interactions) + InteractionItem
// avec highlight du terme + AddInteractionForm (transcripts inclus).

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AddInteractionForm from './AddInteractionForm';
import Skeleton from '../ui/react/Skeleton';
import {
  INTERACTION_KIND_LABELS,
  type Interaction,
} from '../../../types/prospect';

interface Props {
  prospectId: string;
  onCountChange?: (n: number) => void;
}

export default function ProspectHistoriqueTab({ prospectId, onCountChange }: Props) {
  const [searchInput, setSearchInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const trimmed = debounced.trim();
    const endpoint = trimmed
      ? '/api/admin/prospects/interactions/search'
      : '/api/admin/prospects/interactions/list';

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prospect_id: prospectId,
        ...(trimmed ? { q: trimmed } : {}),
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
        if (controller.signal.aborted) return;
        const list = (json.interactions as Interaction[]) ?? [];
        setInteractions(list);
        if (!trimmed) onCountChange?.(list.length);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospectId, debounced, reloadKey]);

  return (
    <div className="space-y-3 font-sans">
      <input
        type="search"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder="Rechercher dans l'historique (notes, DMs, transcripts)…"
        className="w-full border border-[#E4DED3] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97B3D]"
        aria-label="Rechercher dans l'historique"
      />

      {loading ? (
        <div className="space-y-2 py-2" aria-label="Chargement de l'historique">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-11/12" />
          <Skeleton className="h-8 w-10/12" />
          <Skeleton className="h-8 w-11/12" />
        </div>
      ) : error ? (
        <div className="text-sm text-[#B34444] py-2">{error}</div>
      ) : interactions.length === 0 ? (
        <div className="py-6 text-center text-[#6B7A90] font-sans">
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="text-sm italic">
            {debounced.trim()
              ? `Aucune interaction ne correspond à « ${debounced.trim()} »`
              : 'Aucune interaction. Note un appel, un DM, un RDV…'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
          {interactions.map((i) => (
            <InteractionItem key={i.id} interaction={i} searchTerm={debounced.trim()} />
          ))}
        </ul>
      )}

      <AddInteractionForm
        prospectId={prospectId}
        onAdded={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

const MAX_PREVIEW = 200;

function InteractionItem({
  interaction,
  searchTerm,
}: {
  interaction: Interaction;
  searchTerm: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isTranscript =
    interaction.kind === 'transcript_meet' || interaction.kind === 'transcript_call';
  const needsCollapse = interaction.content.length > MAX_PREVIEW;
  const shown =
    expanded || !needsCollapse
      ? interaction.content
      : interaction.content.slice(0, MAX_PREVIEW) + '…';

  const occurredDate = new Date(interaction.occurred_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <li className="border-b border-dashed border-[#E4DED3] py-2 last:border-b-0">
      <div className="text-[11px] font-semibold text-[#1B2E4A] mb-0.5 flex items-center gap-2">
        <span>{occurredDate}</span>
        <span aria-hidden="true">·</span>
        <span className={isTranscript ? 'text-[#D97B3D]' : ''}>
          {INTERACTION_KIND_LABELS[interaction.kind]}
        </span>
      </div>
      <div className="text-sm text-[#1B2E4A] whitespace-pre-wrap break-words">
        {highlightTerm(shown, searchTerm)}
      </div>
      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-[#D97B3D] hover:underline mt-1"
        >
          {expanded ? 'Réduire' : 'Voir plus'}
        </button>
      )}
    </li>
  );
}

function highlightTerm(text: string, term: string): ReactNode {
  if (!term) return text;
  // Échappe les caractères regex
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-[#FBEEE2] text-[#D97B3D] px-0.5 rounded">
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}
