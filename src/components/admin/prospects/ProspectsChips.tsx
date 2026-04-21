// ProspectsChips.tsx — barre de filtres chips.
// Jalon 2c : counts calculés depuis prospects[], interactivité en Phase 4.

import Chip from '../ui/react/Chip';
import type { Prospect, ProspectStatus } from '../../../types/prospect';

interface Props {
  prospects: Prospect[];
}

export default function ProspectsChips({ prospects }: Props) {
  const countByStatus = (s: ProspectStatus) =>
    prospects.filter((p) => p.status === s).length;

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl p-3 mb-4 flex gap-2 flex-wrap items-center font-sans">
      <Chip label="Tous" count={prospects.length} active />
      <Chip label="Prospect" count={countByStatus('prospect')} />
      <Chip label="Contacté" count={countByStatus('contacte')} />
      <Chip label="RDV" count={countByStatus('rdv')} />
      <Chip label="Proposition" count={countByStatus('proposition')} />
      <Chip label="Signé" count={countByStatus('signe')} />
      <div className="w-px h-5 bg-[#E4DED3] mx-1" aria-hidden="true" />
      <Chip label="À faire" />
      <Chip label="Fondateur" />
      <input
        type="search"
        placeholder="Rechercher nom, centre, ville…"
        className="flex-1 min-w-[200px] border border-[#E4DED3] bg-[#F8F5F0] px-3 py-2 rounded-lg text-[13px] font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
        disabled
        aria-label="Recherche (activée en Phase 4)"
      />
    </div>
  );
}
