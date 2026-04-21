// TasksTodayBlock.tsx — bloc compact "Aujourd'hui" pour le dashboard.
// Checkbox complete, pas d'édition. Lien "Voir toutes →" vers /admin/tasks.

import { useState } from 'react';
import { classifyNextAction } from '../../../lib/prospects';
import { useToast } from '../../../lib/useToast';
import Toast from '../ui/react/Toast';
import type { TaskWithOwner, Task } from '../../../types/task';

interface Props {
  tasks: TaskWithOwner[];
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

const OWNER_BADGE: Record<NonNullable<TaskWithOwner['owner_type']>, string> = {
  prospect: 'bg-[#E8ECF2] text-[#1E4B7A]',
  contact: 'bg-[#FBEFD8] text-[#B8761F]',
  centre: 'bg-[#E3F0EA] text-[#2F7A5A]',
};

export default function TasksTodayBlock({ tasks: initial }: Props) {
  const [tasks, setTasks] = useState<TaskWithOwner[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, showToast, hideToast } = useToast();

  async function handleComplete(task: TaskWithOwner) {
    if (busy) return;
    setBusy(task.id);
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'done' } : t)));
    try {
      const res = await fetch('/api/admin/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, action: 'done' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...(json.task as Task) } : t)));
      if (json.next_task) {
        showToast('Tâche terminée. Prochaine occurrence créée.', 'success');
      }
    } catch (e) {
      setTasks(previous);
      showToast(`Erreur : ${(e as Error).message}`, 'error');
    } finally {
      setBusy(null);
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-[#E4DED3] bg-white p-6 text-center">
        <svg className="w-8 h-8 mx-auto mb-2 text-[#2F7A5A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <p className="text-sm text-[#6B7A90] font-sans">Aucune tâche en retard ou aujourd'hui. Profite 🙂</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#E4DED3] bg-white overflow-hidden font-sans">
      <ul className="divide-y divide-[#E4DED3]">
        {tasks.slice(0, 10).map((task) => {
          const state = classifyNextAction(task.due_at);
          const isDone = task.status !== 'open';
          const dueLabel = task.due_at
            ? state === 'overdue'
              ? `En retard — ${new Date(task.due_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
              : state === 'today'
                ? `Aujourd'hui ${new Date(task.due_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : new Date(task.due_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            : '';
          const dueClass = isDone
            ? 'text-[#9AA4B4] line-through'
            : state === 'overdue'
              ? 'text-[#B34444] font-semibold'
              : state === 'today'
                ? 'text-[#D97B3D] font-semibold'
                : 'text-[#6B7A90]';

          return (
            <li key={task.id} className={`flex items-center gap-3 px-4 py-3 ${isDone ? 'opacity-60' : ''}`}>
              <button
                type="button"
                onClick={() => handleComplete(task)}
                disabled={isDone || busy === task.id}
                className={`${isDone ? 'text-[#2F7A5A]' : 'text-[#6B7A90] hover:text-[#D97B3D]'} disabled:cursor-not-allowed`}
                aria-label={isDone ? 'Tâche terminée' : 'Marquer comme faite'}
                style={{ minHeight: 36, minWidth: 36 }}
              >
                {isDone ? <CheckCircleIcon /> : <CircleIcon />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm truncate ${isDone ? 'text-[#6B7A90] line-through' : 'text-[#1B2E4A]'}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs">
                  {task.owner_type && task.owner_label && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${OWNER_BADGE[task.owner_type]}`}>
                      {task.owner_label}
                    </span>
                  )}
                  <span className={dueClass}>{dueLabel}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-[#E4DED3] px-4 py-2 bg-[#FDFBF7] text-center">
        <a
          href="/admin/tasks"
          className="text-sm text-[#D97B3D] font-sans font-medium hover:underline"
          style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
        >
          Voir toutes les tâches &rarr;
        </a>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          action={toast.action}
          onClose={hideToast}
        />
      )}
    </div>
  );
}
