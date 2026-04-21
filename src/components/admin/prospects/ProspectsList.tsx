// ProspectsList.tsx — vue liste complète avec expansion inline.
// Jalon 2c : panel d'édition injecté sous la row quand expandedId === p.id.
// L'état prospects[] lui-même est géré par le parent (ProspectsPage).

import { useState } from 'react';
import ProspectRow from './ProspectRow';
import ProspectEditPanel from './ProspectEditPanel';
import type { Prospect } from '../../../types/prospect';

interface Props {
  prospects: Prospect[];
  onSaved: (updated: Prospect) => void;
  onDeleted: (id: string) => void;
}

export default function ProspectsList({ prospects, onSaved, onDeleted }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function handleToggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function handleCancelEdit() {
    setExpandedId(null);
  }

  function handleLocalSave(updated: Prospect) {
    onSaved(updated);
    // Garde le panel ouvert pour voir le résultat
  }

  function handleLocalDelete(id: string) {
    onDeleted(id);
    setExpandedId(null);
  }

  if (prospects.length === 0) {
    return (
      <div className="bg-white border border-[#E4DED3] rounded-xl p-8 text-center text-[#6B7A90] font-sans">
        Aucun prospect. Utilise le bouton « + Nouveau prospect » pour en ajouter.
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl overflow-hidden font-sans">
      <div className="hidden md:grid grid-cols-[1.8fr_1fr_1fr_1.2fr_40px] gap-4 px-5 py-2.5 bg-[#E8ECF2] text-[11px] font-semibold text-[#1B2E4A] uppercase tracking-[0.06em]">
        <div>Prospect</div>
        <div>Source</div>
        <div>Statut</div>
        <div>Prochaine action</div>
        <div />
      </div>

      {prospects.map((p) => (
        <div key={p.id}>
          <ProspectRow
            prospect={p}
            isExpanded={expandedId === p.id}
            onToggle={() => handleToggle(p.id)}
          />
          {expandedId === p.id && (
            <ProspectEditPanel
              prospect={p}
              onSave={handleLocalSave}
              onCancel={handleCancelEdit}
              onDelete={handleLocalDelete}
            />
          )}
        </div>
      ))}
    </div>
  );
}
