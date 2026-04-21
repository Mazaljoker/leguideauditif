// PipelineCard.tsx — card kanban draggable.
// Phase 4 : états temporels overdue/today/future avec icônes Lucide inline.

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { classifyNextAction, type TemporalState } from '../../../lib/prospects';
import type { Prospect, ProspectSource } from '../../../types/prospect';
import { PROSPECT_SOURCE_LABELS } from '../../../types/prospect';

interface Props {
  prospect: Prospect;
  isDragOverlay?: boolean;
  onClick?: (id: string) => void;
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

function AlertTriangleIcon() {
  return (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      className="w-3 h-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
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

function formatNextActionShort(prospect: Prospect, state: TemporalState): string {
  if (!prospect.next_action && !prospect.next_action_at) return '—';

  const date = prospect.next_action_at ? new Date(prospect.next_action_at) : null;

  if (state === 'overdue' && date) {
    return `En retard — ${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
  }
  if (state === 'today' && date) {
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `Auj. ${time}`;
  }
  if (state === 'future' && date) {
    return (
      prospect.next_action ??
      date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    );
  }
  return prospect.next_action ?? '—';
}

export default function PipelineCard({ prospect, isDragOverlay = false, onClick }: Props) {
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

  const temporalState = classifyNextAction(prospect.next_action_at);
  const temporalClass =
    temporalState === 'overdue'
      ? 'text-[#B34444] font-semibold'
      : temporalState === 'today'
        ? 'text-[#D97B3D] font-semibold'
        : 'text-[#6B7A90]';

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={isDragOverlay || !onClick ? undefined : () => onClick(prospect.id)}
      className="bg-[#F8F5F0] border border-[#E4DED3] rounded-lg px-3 py-2.5 cursor-grab transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(27,46,74,0.08)] active:cursor-grabbing font-sans"
    >
      <div className="font-semibold text-sm text-[#1B2E4A] flex items-center gap-1.5 mb-0.5">
        <span>{prospect.name}</span>
        {prospect.is_fondateur && <CrownIcon />}
      </div>
      {subline && (
        <div className="text-xs text-[#6B7A90] mb-2 leading-snug">{subline}</div>
      )}
      <div className="flex items-center justify-between gap-1.5 text-[11px]">
        <span className={`inline-flex items-center gap-1 truncate ${temporalClass}`}>
          {temporalState === 'overdue' && <AlertTriangleIcon />}
          {temporalState === 'today' && <PhoneIcon />}
          <span className="truncate">{formatNextActionShort(prospect, temporalState)}</span>
        </span>
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
