// ContactsFilters.tsx — chips d'état Waalaxy + search + toggles.

import Chip from '../ui/react/Chip';
import { WAALAXY_STATE_LABELS, type Contact, type WaalaxyState } from '../../../types/prospect';

export interface ContactFilters {
  states: WaalaxyState[];
  onlyUnconverted: boolean;
  onlyWithReply: boolean;
}

interface Props {
  contacts: Contact[];
  filters: ContactFilters;
  onFiltersChange: (f: ContactFilters) => void;
  searchInput: string;
  onSearchChange: (v: string) => void;
}

const STATE_ORDER: WaalaxyState[] = [
  'interested',
  'replied',
  'later_interested',
  'connected',
  'not_interested',
];

function countByState(contacts: Contact[], state: WaalaxyState): number {
  return contacts.filter((c) => c.waalaxy_state === state).length;
}

function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-[#6B7A90]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function ContactsFilters({
  contacts,
  filters,
  onFiltersChange,
  searchInput,
  onSearchChange,
}: Props) {
  function toggleState(state: WaalaxyState) {
    const has = filters.states.includes(state);
    onFiltersChange({
      ...filters,
      states: has ? filters.states.filter((s) => s !== state) : [...filters.states, state],
    });
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        {STATE_ORDER.map((state) => (
          <Chip
            key={state}
            label={WAALAXY_STATE_LABELS[state]}
            count={countByState(contacts, state)}
            active={filters.states.includes(state)}
            onClick={() => toggleState(state)}
          />
        ))}

        <span className="mx-1 text-[#E4DED3]" aria-hidden="true">|</span>

        <Chip
          label="À convertir"
          active={filters.onlyUnconverted}
          onClick={() =>
            onFiltersChange({ ...filters, onlyUnconverted: !filters.onlyUnconverted })
          }
        />
        <Chip
          label="Avec réponse"
          active={filters.onlyWithReply}
          onClick={() =>
            onFiltersChange({ ...filters, onlyWithReply: !filters.onlyWithReply })
          }
        />
      </div>

      <div className="relative max-w-md">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <SearchIcon />
        </div>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un nom, entreprise, ville…"
          className="w-full pl-9 pr-3 py-2 border border-[#E4DED3] bg-white rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
          aria-label="Rechercher un contact"
          style={{ minHeight: 40 }}
        />
      </div>
    </div>
  );
}
