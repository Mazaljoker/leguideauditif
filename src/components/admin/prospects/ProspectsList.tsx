// ProspectsList.tsx — vue liste avec expansion inline.
// Phase 3 : expandedId remonté au parent (ProspectsPage) pour permettre
// le collapse auto au toggle de vue Pipeline/Liste (PRD §6.2, §6.5).

import ProspectRow from './ProspectRow';
import ProspectEditPanel from './ProspectEditPanel';
import type { Prospect } from '../../../types/prospect';
import type { Task } from '../../../types/task';

interface Props {
  prospects: Prospect[];
  tasksByProspect?: Map<string, Task>;
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  onSaved: (updated: Prospect) => void;
  onDeleted: (id: string) => void;
}

export default function ProspectsList({
  prospects,
  tasksByProspect,
  expandedId,
  onToggle,
  onSaved,
  onDeleted,
}: Props) {
  function handleRowToggle(id: string) {
    onToggle(expandedId === id ? null : id);
  }

  function handleCancelEdit() {
    onToggle(null);
  }

  function handleLocalDelete(id: string) {
    onDeleted(id);
    onToggle(null);
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
            nextTask={tasksByProspect?.get(p.id)}
            isExpanded={expandedId === p.id}
            onToggle={() => handleRowToggle(p.id)}
          />
          {expandedId === p.id && (
            <ProspectEditPanel
              prospect={p}
              onSave={onSaved}
              onCancel={handleCancelEdit}
              onDelete={handleLocalDelete}
            />
          )}
        </div>
      ))}
    </div>
  );
}
