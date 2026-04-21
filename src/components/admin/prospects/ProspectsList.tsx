// ProspectsList.tsx — vue liste complète.
// Jalon 2b : read-only, rend les rows à partir de la prop initiale.
// Jalon 2c : gère l'état local (expansion + mutations).

import { useState } from 'react';
import ProspectRow from './ProspectRow';
import type { Prospect } from '../../../types/prospect';

interface Props {
  prospects: Prospect[];
  initialExpandedId?: string | null;
}

export default function ProspectsList({ prospects, initialExpandedId = null }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandedId);

  if (prospects.length === 0) {
    return (
      <div className="bg-white border border-[#E4DED3] rounded-xl p-8 text-center text-[#6B7A90] font-sans">
        Aucun prospect. Utilise le bouton « + Nouveau prospect » pour en ajouter.
      </div>
    );
  }

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl overflow-hidden font-sans">
      {/* Header desktop only */}
      <div className="hidden md:grid grid-cols-[1.8fr_1fr_1fr_1.2fr_40px] gap-4 px-5 py-2.5 bg-[#E8ECF2] text-[11px] font-semibold text-[#1B2E4A] uppercase tracking-[0.06em]">
        <div>Prospect</div>
        <div>Source</div>
        <div>Statut</div>
        <div>Prochaine action</div>
        <div />
      </div>

      {prospects.map((p) => (
        <ProspectRow
          key={p.id}
          prospect={p}
          isExpanded={expandedId === p.id}
          onToggle={() => handleToggle(p.id)}
        />
      ))}
    </div>
  );
}
