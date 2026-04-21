// PipelineCard.tsx — card kanban draggable.
// Phase 3 : pas de click-to-edit (l'édition ne passe que par la vue Liste).
// L'édition sera accessible en bascule Liste + click sur la row.

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Prospect, ProspectSource } from '../../../types/prospect';
import { PROSPECT_SOURCE_LABELS } from '../../../types/prospect';

interface Props {
  prospect: Prospect;
  // Overlay rendu (sans drag handlers) : appelé depuis <DragOverlay> du Board
  isDragOverlay?: boolean;
}

const SOURCE_DOT_COLORS: Record<ProspectSource, string> = {
  linkedin: '#0A66C2',
  rpps: '#1B2E4A',
  entrant: '#D97B3D',
  autre: '#6B7A90',
};

function CrownIcon() {
  return (
    <svg
      className="w-3 h-3 text-[#D97B3D]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Partenaire Fondateur"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}

function buildSubline(prospect: Prospect): string {
  const parts: string[] = [];
  if (prospect.company) parts.push(prospect.company);
  const locBits = [prospect.cp, prospect.city].filter(Boolean);
  if (locBits.length > 0) parts.push(locBits.join(' '));
  return parts.join(' · ');
}

export default function PipelineCard({ prospect, isDragOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    data: { prospect },
    disabled: isDragOverlay,
  });

  const style: React.CSSProperties = isDragOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      };

  const subline = buildSubline(prospect);
  const sourceColor = SOURCE_DOT_COLORS[prospect.source];
  const sourceLabel = PROSPECT_SOURCE_LABELS[prospect.source];

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className="bg-[#F8F5F0] border border-[#E4DED3] rounded-lg px-3 py-2.5 cursor-grab transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(27,46,74,0.08)] active:cursor-grabbing font-sans"
    >
      <div className="font-semibold text-sm text-[#1B2E4A] flex items-center gap-1.5 mb-0.5">
        <span>{prospect.name}</span>
        {prospect.is_fondateur && <CrownIcon />}
      </div>
      {subline && (
        <div className="text-xs text-[#6B7A90] mb-2 leading-snug">{subline}</div>
      )}
      <div className="flex items-center justify-between gap-1.5 text-[11px] text-[#6B7A90]">
        <span className="truncate">{prospect.next_action ?? '—'}</span>
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: sourceColor }}
          title={sourceLabel}
          aria-label={`Source : ${sourceLabel}`}
        />
      </div>
    </div>
  );
}
