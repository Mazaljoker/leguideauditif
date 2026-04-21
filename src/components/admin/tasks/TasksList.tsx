// TasksList.tsx — wrapper de la table des tâches.

import TaskRow from './TaskRow';
import type { TaskWithOwner } from '../../../types/task';

interface Props {
  tasks: TaskWithOwner[];
  onEdit: (task: TaskWithOwner) => void;
  onComplete: (task: TaskWithOwner) => Promise<void>;
  onSkip: (task: TaskWithOwner) => Promise<void>;
}

export default function TasksList({ tasks, onEdit, onComplete, onSkip }: Props) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white border border-[#E4DED3] rounded-xl py-16 text-center">
        <svg
          className="w-10 h-10 mx-auto mb-3 text-[#E4DED3]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <p className="text-sm text-[#6B7A90] font-sans italic">
          Aucune tâche avec ces filtres.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl overflow-hidden">
      <div className="hidden md:grid grid-cols-[24px_2fr_1.2fr_1fr_80px] gap-3 px-4 py-2 border-b border-[#E4DED3] bg-[#FDFBF7] text-[11px] font-semibold text-[#6B7A90] uppercase tracking-[0.06em] font-sans">
        <div></div>
        <div>Tâche</div>
        <div>Attachée à</div>
        <div>Échéance</div>
        <div className="text-right">Actions</div>
      </div>
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          onClick={() => onEdit(t)}
          onComplete={() => onComplete(t)}
          onSkip={() => onSkip(t)}
        />
      ))}
    </div>
  );
}
