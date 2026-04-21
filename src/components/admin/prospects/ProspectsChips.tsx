// ProspectsChips.tsx — barre de filtres chips interactive (Phase 4).
// Cumulatif sur statuts, exclusif sur "À faire" et "Fondateur".
// Chip "Perdu" visible uniquement en vue Liste (§6.9 PRD).

import { useMemo } from 'react';
import Chip from '../ui/react/Chip';
import type { Prospect, ProspectStatus } from '../../../types/prospect';
import type { Task } from '../../../types/task';
import type { ActiveFilters } from './ProspectsPage';

interface Props {
  prospects: Prospect[];
  tasksByProspect?: Map<string, Task>;
  filters: ActiveFilters;
  onFiltersChange: (next: ActiveFilters) => void;
  searchInput: string;
  onSearchChange: (v: string) => void;
  currentView: 'pipeline' | 'list';
}

export default function ProspectsChips({
  prospects,
  tasksByProspect,
  filters,
  onFiltersChange,
  searchInput,
  onSearchChange,
  currentView,
}: Props) {
  const counts = useMemo(() => {
    const now = new Date();
    const tomorrowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    return {
      // "Tous" exclut les perdus — cohérent avec la logique de filtrage par défaut
      tous: prospects.filter((p) => p.status !== 'perdu').length,
      prospect: prospects.filter((p) => p.status === 'prospect').length,
      contacte: prospects.filter((p) => p.status === 'contacte').length,
      rdv: prospects.filter((p) => p.status === 'rdv').length,
      proposition: prospects.filter((p) => p.status === 'proposition').length,
      signe: prospects.filter((p) => p.status === 'signe').length,
      perdu: prospects.filter((p) => p.status === 'perdu').length,
      aFaire: prospects.filter((p) => {
        const task = tasksByProspect?.get(p.id);
        return task?.due_at && new Date(task.due_at) < tomorrowStart;
      }).length,
      fondateur: prospects.filter((p) => p.is_fondateur).length,
    };
  }, [prospects, tasksByProspect]);

  function toggleStatus(status: ProspectStatus) {
    const current = filters.statuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, statuses: next });
  }

  function clickTous() {
    if (filters.statuses.length === 0) return;
    onFiltersChange({ ...filters, statuses: [] });
  }

  function toggleAFaire() {
    onFiltersChange({ ...filters, aFaire: !filters.aFaire });
  }

  function toggleFondateur() {
    onFiltersChange({ ...filters, fondateur: !filters.fondateur });
  }

  const isStatusActive = (s: ProspectStatus) => filters.statuses.includes(s);
  const isTousActive = filters.statuses.length === 0;

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl p-3 mb-4 flex gap-2 flex-wrap items-center font-sans">
      <Chip label="Tous" count={counts.tous} active={isTousActive} onClick={clickTous} />
      <Chip
        label="Prospect"
        count={counts.prospect}
        active={isStatusActive('prospect')}
        onClick={() => toggleStatus('prospect')}
      />
      <Chip
        label="Contacté"
        count={counts.contacte}
        active={isStatusActive('contacte')}
        onClick={() => toggleStatus('contacte')}
      />
      <Chip
        label="RDV"
        count={counts.rdv}
        active={isStatusActive('rdv')}
        onClick={() => toggleStatus('rdv')}
      />
      <Chip
        label="Proposition"
        count={counts.proposition}
        active={isStatusActive('proposition')}
        onClick={() => toggleStatus('proposition')}
      />
      <Chip
        label="Signé"
        count={counts.signe}
        active={isStatusActive('signe')}
        onClick={() => toggleStatus('signe')}
      />

      <div className="w-px h-5 bg-[#E4DED3] mx-1" aria-hidden="true" />

      <Chip
        label="À faire"
        count={counts.aFaire}
        active={filters.aFaire}
        onClick={toggleAFaire}
      />
      <Chip
        label="Fondateur"
        count={counts.fondateur}
        active={filters.fondateur}
        onClick={toggleFondateur}
      />

      {currentView === 'list' && (
        <Chip
          label="Perdu"
          count={counts.perdu}
          active={isStatusActive('perdu')}
          onClick={() => toggleStatus('perdu')}
        />
      )}

      <input
        type="search"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Rechercher nom, centre, ville…"
        className="flex-1 min-w-[200px] border border-[#E4DED3] bg-[#F8F5F0] px-3 py-2 rounded-lg text-[13px] font-sans text-[#1B2E4A] focus:outline-none focus:ring-2 focus:ring-[#D97B3D] focus:ring-offset-1"
        aria-label="Rechercher un prospect"
      />
    </div>
  );
}
