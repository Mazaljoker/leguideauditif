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

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-[#6B7A90]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
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
      apporteur: prospects.filter((p) => p.is_apporteur).length,
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

  function toggleApporteur() {
    onFiltersChange({ ...filters, apporteur: !filters.apporteur });
  }

  const isStatusActive = (s: ProspectStatus) => filters.statuses.includes(s);
  const isTousActive = filters.statuses.length === 0;

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl p-3 mb-4 font-sans">
      <div className="flex gap-2 flex-wrap items-center">
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
        <Chip
          label="Apporteur"
          count={counts.apporteur}
          active={filters.apporteur}
          onClick={toggleApporteur}
        />

        {currentView === 'list' && (
          <Chip
            label="Perdu"
            count={counts.perdu}
            active={isStatusActive('perdu')}
            onClick={() => toggleStatus('perdu')}
          />
        )}
      </div>

      <div className="relative max-w-md mt-3">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher nom, centre, téléphone, ville…"
          className="w-full min-h-10 pl-9 pr-3 py-2 border border-[#E4DED3] bg-white rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
          aria-label="Rechercher un prospect"
        />
      </div>
    </div>
  );
}
