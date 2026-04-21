// ProspectsPage.tsx — root React de /admin/prospects.
// Phase 3 : toggle Pipeline/Liste + drag & drop + handleMove optimiste.
// Collapse auto du panel d'édition au toggle (PRD §6.2, §6.5).

import { useMemo, useState } from 'react';
import ProspectsHeader from './ProspectsHeader';
import ProspectsStats from './ProspectsStats';
import ProspectsChips from './ProspectsChips';
import ProspectsList from './ProspectsList';
import NewProspectDialog from './NewProspectDialog';
import ViewToggle, { type ProspectsView } from './ViewToggle';
import PipelineBoard from './PipelineBoard';
import { buildStats } from '../../../lib/prospects';
import type { Prospect, ProspectStatus } from '../../../types/prospect';

interface Props {
  initialProspects: Prospect[];
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

  const stats = useMemo(() => buildStats(prospects), [prospects]);

  function handleCreated(p: Prospect) {
    setProspects((prev) => [p, ...prev]);
  }

  function handleSaved(updated: Prospect) {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function handleDeleted(id: string) {
    setProspects((prev) => prev.filter((p) => p.id !== id));
  }

  // Collapse auto du panel d'édition au toggle de vue (PRD §6.2, §6.5)
  function handleViewChange(next: ProspectsView) {
    if (next === view) return;
    setView(next);
    setExpandedId(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    }
  }

  // Drag & drop kanban : optimistic update + revert en cas d'erreur
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
      // Re-sync avec la version serveur (updated_at à jour)
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? (json.prospect as Prospect) : p))
      );
    } catch (e) {
      setProspects(previous);
      // Pas de lib toast installée (règle scope Phase 3) → alert natif
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

      <ProspectsChips prospects={prospects} />

      {view === 'pipeline' ? (
        <PipelineBoard prospects={prospects} onMove={handleMove} />
      ) : (
        <ProspectsList
          prospects={prospects}
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
