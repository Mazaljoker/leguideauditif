// ProspectRow.tsx — une row liste.
// Phase 4 : icônes + couleurs overdue/today sur la colonne Prochaine action
// et dans le mobile-meta compact.

import Badge from '../ui/react/Badge';
import { classifyNextAction, type TemporalState } from '../../../lib/prospects';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCE_LABELS,
  type Prospect,
} from '../../../types/prospect';
import type { Task } from '../../../types/task';

interface Props {
  prospect: Prospect;
  nextTask?: Task | null;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function formatDateForRow(iso: string | null, state: TemporalState): string {
  if (!iso || state === 'none') return '';
  const d = new Date(iso);
  if (state === 'overdue') {
    return `En retard — ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
  }
  if (state === 'today') {
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `Aujourd'hui ${time}`;
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function CrownIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-[#D97B3D]"
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

function HandshakeIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-[#0C447C]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Apporteur d’affaires"
    >
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-[#6B7A90] transition-transform ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
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

export default function ProspectRow({ prospect, nextTask, isExpanded = false, onToggle }: Props) {
  const companyLine = [prospect.company, [prospect.cp, prospect.city].filter(Boolean).join(' ')]
    .filter((s) => s && s.length > 0)
    .join(' · ');

  const nextActionDueAt = nextTask?.due_at ?? null;
  const nextActionTitle = nextTask?.title ?? null;
  const temporalState = classifyNextAction(nextActionDueAt);
  const temporalClass =
    temporalState === 'overdue'
      ? 'text-[#B34444] font-semibold'
      : temporalState === 'today'
        ? 'text-[#D97B3D] font-semibold'
        : 'text-[#6B7A90]';
  const dateLabel = formatDateForRow(nextActionDueAt, temporalState);

  return (
    <div
      onClick={onToggle}
      className={`grid md:grid-cols-[1.8fr_1fr_1fr_1.2fr_40px] grid-cols-[1fr_40px] gap-4 px-5 py-4 items-center border-b border-[#E4DED3] last:border-b-0 cursor-pointer transition-colors font-sans ${
        isExpanded ? 'bg-[#FDFBF7]' : 'hover:bg-[#FDFBF7]'
      }`}
    >
      {/* Colonne 1 : Nom + sub */}
      <div>
        <div className="font-semibold text-[15px] text-[#1B2E4A] flex items-center gap-2">
          <span>{prospect.name}</span>
          {prospect.is_fondateur && <CrownIcon />}
          {prospect.is_apporteur && <HandshakeIcon />}
        </div>
        {companyLine && (
          <div className="text-[13px] text-[#6B7A90] mt-0.5">{companyLine}</div>
        )}
        {/* Mobile : métas empilées */}
        <div className="flex flex-wrap gap-2 mt-2 md:hidden items-center">
          <Badge variant={prospect.status}>{PROSPECT_STATUS_LABELS[prospect.status]}</Badge>
          {dateLabel && (
            <span className={`text-xs inline-flex items-center gap-1 ${temporalClass}`}>
              {temporalState === 'overdue' && <AlertTriangleIcon />}
              {temporalState === 'today' && <PhoneIcon />}
              {dateLabel}
            </span>
          )}
        </div>
      </div>

      {/* Colonne 2 : Source — desktop only */}
      <div className="hidden md:block">
        <Badge variant={`source-${prospect.source}` as const}>
          {PROSPECT_SOURCE_LABELS[prospect.source]}
        </Badge>
      </div>

      {/* Colonne 3 : Statut — desktop only */}
      <div className="hidden md:block">
        <Badge variant={prospect.status}>{PROSPECT_STATUS_LABELS[prospect.status]}</Badge>
      </div>

      {/* Colonne 4 : Prochaine action — desktop only */}
      <div className="hidden md:flex flex-col gap-0.5 min-w-0">
        <span className="text-[#1B2E4A] font-medium text-sm truncate">
          {nextActionTitle ?? '—'}
        </span>
        {dateLabel && (
          <span className={`text-xs inline-flex items-center gap-1 ${temporalClass}`}>
            {temporalState === 'overdue' && <AlertTriangleIcon />}
            {temporalState === 'today' && <PhoneIcon />}
            {dateLabel}
          </span>
        )}
      </div>

      {/* Colonne 5 : chevron */}
      <div className="flex justify-end">
        <ChevronIcon expanded={isExpanded} />
      </div>
    </div>
  );
}
