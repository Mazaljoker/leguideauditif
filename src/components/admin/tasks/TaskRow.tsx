// TaskRow.tsx — une ligne de tâche dans TasksList.
// Checkbox → complete, click row → edit modal.

import { useState } from 'react';
import { classifyNextAction, type TemporalState } from '../../../lib/prospects';
import {
  TASK_OWNER_TYPE_LABELS,
  TASK_RECURRENCE_LABELS,
  type TaskWithOwner,
} from '../../../types/task';

interface Props {
  task: TaskWithOwner;
  onClick: () => void;
  onComplete: () => Promise<void>;
  onSkip: () => Promise<void>;
}

function formatDue(iso: string | null, state: TemporalState): string {
  if (!iso) return 'Sans échéance';
  const d = new Date(iso);
  if (state === 'overdue') {
    return `En retard — ${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`;
  }
  if (state === 'today') {
    return `Aujourd'hui ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CircleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg className="w-3 h-3 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

const OWNER_BADGE_COLORS: Record<NonNullable<TaskWithOwner['owner_type']>, string> = {
  prospect: 'bg-[#E8ECF2] text-[#1E4B7A]',
  contact: 'bg-[#FBEFD8] text-[#B8761F]',
  centre: 'bg-[#E3F0EA] text-[#2F7A5A]',
};

export default function TaskRow({ task, onClick, onComplete, onSkip }: Props) {
  const [busy, setBusy] = useState(false);
  const state = classifyNextAction(task.due_at);
  const dueLabel = formatDue(task.due_at, state);
  const dueClass =
    task.status !== 'open'
      ? 'text-[#9AA4B4] line-through'
      : state === 'overdue'
        ? 'text-[#B34444] font-semibold'
        : state === 'today'
          ? 'text-[#D97B3D] font-semibold'
          : 'text-[#6B7A90]';

  const isDone = task.status !== 'open';

  async function handleCheckbox(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy || isDone) return;
    setBusy(true);
    try {
      await onComplete();
    } finally {
      setBusy(false);
    }
  }

  async function handleSkip(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy || isDone) return;
    setBusy(true);
    try {
      await onSkip();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClick}
      className={`grid md:grid-cols-[24px_2fr_1.2fr_1fr_80px] grid-cols-[24px_1fr_60px] gap-3 px-4 py-3 items-center border-b border-[#E4DED3] last:border-b-0 cursor-pointer transition-colors font-sans hover:bg-[#FDFBF7] ${isDone ? 'opacity-60' : ''}`}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleCheckbox}
        disabled={busy || isDone}
        className={`${isDone ? 'text-[#2F7A5A]' : 'text-[#6B7A90] hover:text-[#D97B3D]'} disabled:cursor-not-allowed`}
        aria-label={isDone ? 'Tâche terminée' : 'Marquer comme faite'}
        style={{ minHeight: 40, minWidth: 40 }}
      >
        {isDone ? <CheckCircleIcon /> : <CircleIcon />}
      </button>

      {/* Titre + owner */}
      <div className="min-w-0">
        <div className={`font-semibold text-[15px] ${isDone ? 'text-[#6B7A90] line-through' : 'text-[#1B2E4A]'} truncate flex items-center gap-1.5`}>
          <span className="truncate">{task.title}</span>
          {task.recurrence_kind !== 'none' && (
            <span
              className="text-[#D97B3D] shrink-0"
              title={TASK_RECURRENCE_LABELS[task.recurrence_kind]}
            >
              <RepeatIcon />
            </span>
          )}
        </div>
        {task.description && (
          <div className="text-[13px] text-[#6B7A90] mt-0.5 truncate">{task.description}</div>
        )}
        {/* Mobile : meta empilée */}
        <div className="flex flex-wrap gap-2 mt-1.5 md:hidden items-center">
          {task.owner_type && task.owner_label && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${OWNER_BADGE_COLORS[task.owner_type]}`}>
              {task.owner_label}
            </span>
          )}
          <span className={`text-xs ${dueClass}`}>{dueLabel}</span>
        </div>
      </div>

      {/* Owner — desktop */}
      <div className="hidden md:block min-w-0">
        {task.owner_type && task.owner_label ? (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${OWNER_BADGE_COLORS[task.owner_type]}`}>
            <span className="opacity-70">{TASK_OWNER_TYPE_LABELS[task.owner_type]}</span>
            <span className="truncate max-w-[180px]">{task.owner_label}</span>
          </span>
        ) : (
          <span className="text-xs text-[#9AA4B4] italic">Libre</span>
        )}
      </div>

      {/* Due — desktop */}
      <div className={`hidden md:block text-sm ${dueClass}`}>{dueLabel}</div>

      {/* Actions — desktop */}
      <div className="flex items-center justify-end gap-1">
        {!isDone && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={busy}
            className="p-2 rounded-lg text-[#6B7A90] hover:text-[#1B2E4A] hover:bg-[#E8ECF2] disabled:opacity-50"
            aria-label="Ignorer"
            title="Ignorer"
            style={{ minHeight: 40, minWidth: 40 }}
          >
            <SkipIcon />
          </button>
        )}
      </div>
    </div>
  );
}
