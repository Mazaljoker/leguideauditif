// ProspectsPage.tsx — root React de /admin/prospects.
// Phase 4 : filtres chips actifs + search debounced + filteredProspects
// passé aux vues (Pipeline + Liste). Chips et Stats conservent le total.

import { useEffect, useMemo, useState } from 'react';
import ProspectsHeader from './ProspectsHeader';
import ProspectsStats from './ProspectsStats';
import ProspectsChips from './ProspectsChips';
import ProspectsList from './ProspectsList';
import NewProspectDialog from './NewProspectDialog';
import ViewToggle, { type ProspectsView } from './ViewToggle';
import PipelineBoard from './PipelineBoard';
import { buildStats, normalizeForSearch } from '../../../lib/prospects';
import type { Prospect, ProspectStatus } from '../../../types/prospect';

interface Props {
  initialProspects: Prospect[];
}

export interface ActiveFilters {
  statuses: ProspectStatus[];
  aFaire: boolean;
  fondateur: boolean;
}

const VIEW_STORAGE_KEY = 'lga-admin-prospects-view';

function readInitialView(): ProspectsView {
  if (typeof window === 'undefined') return 'pipeline';
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return stored === 'list' || stored === 'pipeline' ? stored : 'pipeline';
}

export default function ProspectsPage({ initialProspects }: Props) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<ProspectsView>(readInitialView);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Phase 4 : filtres + search
  const [filters, setFilters] = useState<ActiveFilters>({
    statuses: [],
    aFaire: false,
    fondateur: false,
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  const stats = useMemo(() => buildStats(prospects), [prospects]);

  const filteredProspects = useMemo(() => {
    let result = prospects;

    // Statuts (OR cumulatif). Si aucun → "Tous" = tout sauf perdu
    // (§6.9 PRD : perdu caché par défaut, accessible via chip dédiée).
    if (filters.statuses.length > 0) {
      result = result.filter((p) => filters.statuses.includes(p.status));
    } else {
      result = result.filter((p) => p.status !== 'perdu');
    }

    // À faire : next_action_at < tomorrow 00:00
    if (filters.aFaire) {
      const now = new Date();
      const tomorrowStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      result = result.filter(
        (p) => p.next_action_at && new Date(p.next_action_at) < tomorrowStart
      );
    }

    // Fondateur
    if (filters.fondateur) {
      result = result.filter((p) => p.is_fondateur);
    }

    // Search (AND avec chips). normalizeForSearch = insensible casse + accents.
    if (searchDebounced.trim()) {
      const q = normalizeForSearch(searchDebounced);
      result = result.filter(
        (p) =>
          normalizeForSearch(p.name).includes(q) ||
          normalizeForSearch(p.company).includes(q) ||
          normalizeForSearch(p.city).includes(q) ||
          normalizeForSearch(p.cp).includes(q)
      );
    }

    return result;
  }, [prospects, filters, searchDebounced]);

  function handleCreated(p: Prospect) {
    setProspects((prev) => [p, ...prev]);
  }

  function handleSaved(updated: Prospect) {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleDeleted(id: string) {
    setProspects((prev) => prev.filter((p) => p.id !== id));
  }

  function handleViewChange(next: ProspectsView) {
    if (next === view) return;
    setView(next);
    setExpandedId(null);
    // Si on repasse en Pipeline, retire le filtre 'perdu' s'il était actif
    // (chip "Perdu" n'existe pas en kanban — évite la confusion).
    if (next === 'pipeline' && filters.statuses.includes('perdu')) {
      setFilters((f) => ({
        ...f,
        statuses: f.statuses.filter((s) => s !== 'perdu'),
      }));
    }
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  }

  async function handleMove(
    id: string,
    fromStatus: ProspectStatus,
    toStatus: ProspectStatus
  ) {
    const previous = prospects;
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: toStatus } : p))
    );

    try {
      const res = await fetch('/api/admin/prospects/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, from_status: fromStatus, to_status: toStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? (json.prospect as Prospect) : p))
      );
    } catch (e) {
      setProspects(previous);
      alert(`Impossible de déplacer le prospect : ${(e as Error).message}`);
    }
  }

  return (
    <>
      <ProspectsHeader onNewClick={() => setIsDialogOpen(true)} />
      <ProspectsStats stats={stats} />

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <ViewToggle currentView={view} onChange={handleViewChange} />
        {view === 'pipeline' && (
          <span className="text-xs text-[#6B7A90] font-sans">
            Glisse une carte pour changer son statut
          </span>
        )}
      </div>

      <ProspectsChips
        prospects={prospects}
        filters={filters}
        onFiltersChange={setFilters}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        currentView={view}
      />

      {view === 'pipeline' ? (
        <PipelineBoard prospects={filteredProspects} onMove={handleMove} />
      ) : (
        <ProspectsList
          prospects={filteredProspects}
          expandedId={expandedId}
          onToggle={setExpandedId}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      <NewProspectDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
