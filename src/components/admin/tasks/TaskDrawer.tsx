// TaskDrawer.tsx — drawer latéral admin, slide depuis la droite.
// Liste compacte des tâches urgentes (today + overdue, max 10) + quick-add.

import { useEffect, useState } from 'react';
import Button from '../ui/react/Button';
import TaskEditModal from './TaskEditModal';
import Toast from '../ui/react/Toast';
import { useToast } from '../../../lib/useToast';
import { classifyNextAction } from '../../../lib/prospects';
import type { Task, TaskWithOwner } from '../../../types/task';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
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

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

const OWNER_BADGE: Record<NonNullable<TaskWithOwner['owner_type']>, string> = {
  prospect: 'bg-[#E8ECF2] text-[#1E4B7A]',
  contact: 'bg-[#FBEFD8] text-[#B8761F]',
  centre: 'bg-[#E3F0EA] text-[#2F7A5A]',
};

export default function TaskDrawer({ isOpen, onClose }: Props) {
  const [tasks, setTasks] = useState<TaskWithOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    fetch('/api/admin/tasks/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: ['open'],
        due_before: tomorrow.toISOString(),
        limit: 10,
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
        if (!cancelled) setTasks((json.tasks as TaskWithOwner[]) ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

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

  function handleCreated() {
    setIsCreateOpen(false);
    // Reload la liste
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    fetch('/api/admin/tasks/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: ['open'],
        due_before: tomorrow.toISOString(),
        limit: 10,
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setTasks((json.tasks as TaskWithOwner[]) ?? []);
      })
      .catch(() => {});
    showToast('Tâche créée.', 'success');
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[420px] bg-white shadow-2xl z-50 overflow-y-auto transition-transform duration-200 font-sans ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Tâches urgentes"
      >
        <div className="sticky top-0 bg-white border-b border-[#E4DED3] px-4 py-3 flex items-center justify-between z-10">
          <h2 className="font-serif text-xl font-black text-[#1B2E4A]">Tâches</h2>
          <div className="flex items-center gap-1">
            <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
              <PlusIcon />
              Nouvelle
            </Button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-2 rounded-lg text-[#6B7A90] hover:text-[#1B2E4A]"
              style={{ minHeight: 40, minWidth: 40 }}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading && <div className="text-sm text-[#6B7A90]">Chargement…</div>}
          {error && (
            <div className="text-sm text-[#B34444] bg-[#F6E3E3] border border-[#B34444]/20 rounded px-3 py-2">
              {error}
            </div>
          )}
          {!loading && !error && tasks.length === 0 && (
            <div className="text-center py-8 text-[#6B7A90] text-sm italic">
              Aucune tâche urgente. Profite 🙂
            </div>
          )}
          {tasks.length > 0 && (
            <ul className="divide-y divide-[#E4DED3]">
              {tasks.map((task) => {
                const state = classifyNextAction(task.due_at);
                const isDone = task.status !== 'open';
                const dueLabel = task.due_at
                  ? state === 'overdue'
                    ? `En retard — ${new Date(task.due_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                    : state === 'today'
                      ? `Auj. ${new Date(task.due_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
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
                  <li key={task.id} className={`py-3 flex items-start gap-3 ${isDone ? 'opacity-60' : ''}`}>
                    <button
                      type="button"
                      onClick={() => handleComplete(task)}
                      disabled={isDone || busy === task.id}
                      className={`${isDone ? 'text-[#2F7A5A]' : 'text-[#6B7A90] hover:text-[#D97B3D]'} disabled:cursor-not-allowed shrink-0`}
                      aria-label={isDone ? 'Tâche terminée' : 'Marquer comme faite'}
                      style={{ minHeight: 36, minWidth: 36 }}
                    >
                      {isDone ? <CheckCircleIcon /> : <CircleIcon />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${isDone ? 'text-[#6B7A90] line-through' : 'text-[#1B2E4A]'}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap">
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
          )}
        </div>

        <div className="border-t border-[#E4DED3] px-4 py-3 text-center bg-[#FDFBF7]">
          <a
            href="/admin/tasks"
            className="text-sm text-[#D97B3D] font-medium hover:underline"
          >
            Voir toutes les tâches &rarr;
          </a>
        </div>
      </aside>

      <TaskEditModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        task={null}
        onSaved={handleCreated}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          action={toast.action}
          onClose={hideToast}
        />
      )}
    </>
  );
}
