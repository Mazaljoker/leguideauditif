// PipelineColumn.tsx — une colonne kanban.
// Phase 4 : col-sum optionnel (Ancienneté moy. sur Prospect, MRR actif sur Signé).

import { useDroppable } from '@dnd-kit/core';
import PipelineCard from './PipelineCard';
import type { Prospect, ProspectStatus } from '../../../types/prospect';

interface Props {
  status: Exclude<ProspectStatus, 'perdu'>;
  prospects: Prospect[];
  label: string;
  count: number;
  colSum?: { label: string; value: string };
  onCardClick?: (id: string) => void;
}

const COLUMN_COLORS: Record<Exclude<ProspectStatus, 'perdu'>, string> = {
  prospect: '#6B7A90',
  contacte: '#1E4B7A',
  rdv: '#B8761F',
  proposition: '#5B4B7A',
  signe: '#2F7A5A',
};

export default function PipelineColumn({
  status,
  prospects,
  label,
  count,
  colSum,
  onCardClick,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const color = COLUMN_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={`border border-[#E4DED3] rounded-xl p-3 min-h-[320px] flex flex-col gap-2 snap-start md:snap-align-none font-sans transition-colors ${
        isOver ? 'bg-[#FDFBF7]' : 'bg-white'
      }`}
    >
      <div
        className="flex items-center justify-between pb-2.5 border-b-2 mb-1"
        style={{ borderBottomColor: color }}
      >
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#1B2E4A] uppercase tracking-[0.05em]">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          {label}
        </span>
        <span className="font-serif font-black text-lg text-[#1B2E4A]">{count}</span>
      </div>

      {prospects.map((p) => (
        <PipelineCard key={p.id} prospect={p} onClick={onCardClick} />
      ))}

      {prospects.length === 0 && (
        <div className="text-xs text-[#6B7A90] italic text-center py-4 opacity-60">
          Glisse une carte ici
        </div>
      )}

      {colSum && (
        <div className="mt-auto pt-2.5 border-t border-dashed border-[#E4DED3] text-[11px] text-[#6B7A90] uppercase tracking-[0.04em] flex justify-between items-center">
          <span>{colSum.label}</span>
          <strong className="text-[#1B2E4A] font-semibold normal-case tracking-normal">
            {colSum.value}
          </strong>
        </div>
      )}
    </div>
  );
}
