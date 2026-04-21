// TasksPage.tsx — root React de /admin/tasks.
// Filtres chips + search debounced + modal create/edit + complete/skip/delete.

import { useEffect, useMemo, useState } from 'react';
import Button from '../ui/react/Button';
import Chip from '../ui/react/Chip';
import Toast from '../ui/react/Toast';
import TasksList from './TasksList';
import TaskEditModal from './TaskEditModal';
import { useToast } from '../../../lib/useToast';
import { normalizeForSearch } from '../../../lib/prospects';
import type { Task, TaskWithOwner, TaskOwnerType } from '../../../types/task';

interface Props {
  initialTasks: TaskWithOwner[];
}

export type DueRange = 'all' | 'today' | 'overdue' | 'week';

export interface TaskFilters {
  dueRange: DueRange;
  ownerType: TaskOwnerType | 'free' | null; // null = tous, 'free' = libres
  showClosed: boolean;
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-[#6B7A90]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function isInTodayRange(iso: string | null, todayStart: Date, tomorrowStart: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= todayStart && d < tomorrowStart;
}

function isOverdue(iso: string | null, todayStart: Date): boolean {
  if (!iso) return false;
  return new Date(iso) < todayStart;
}

function isInWeekRange(iso: string | null, todayStart: Date, weekEnd: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= todayStart && d < weekEnd;
}

export default function TasksPage({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<TaskWithOwner[]>(initialTasks);
  const [filters, setFilters] = useState<TaskFilters>({
    dueRange: 'all',
    ownerType: null,
    showClosed: false,
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithOwner | null>(null);

  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput), 150);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { todayStart, tomorrowStart, weekEnd } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 86400000);
    const week = new Date(today.getTime() + 7 * 86400000);
    return { todayStart: today, tomorrowStart: tomorrow, weekEnd: week };
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Status : par défaut, masque done/skipped sauf si showClosed
    if (!filters.showClosed) {
      result = result.filter((t) => t.status === 'open');
    }

    // Due range
    if (filters.dueRange === 'today') {
      result = result.filter((t) => isInTodayRange(t.due_at, todayStart, tomorrowStart));
    } else if (filters.dueRange === 'overdue') {
      result = result.filter((t) => t.status === 'open' && isOverdue(t.due_at, todayStart));
    } else if (filters.dueRange === 'week') {
      result = result.filter((t) => isInWeekRange(t.due_at, todayStart, weekEnd));
    }

    // Owner type
    if (filters.ownerType === 'free') {
      result = result.filter((t) => t.owner_type === null);
    } else if (filters.ownerType && filters.ownerType !== 'free') {
      result = result.filter((t) => t.owner_type === filters.ownerType);
    }

    // Search
    if (searchDebounced.trim()) {
      const q = normalizeForSearch(searchDebounced);
      result = result.filter(
        (t) =>
          normalizeForSearch(t.title).includes(q) ||
          normalizeForSearch(t.description).includes(q) ||
          normalizeForSearch(t.owner_label).includes(q)
      );
    }

    return result;
  }, [tasks, filters, searchDebounced, todayStart, tomorrowStart, weekEnd]);

  const counts = useMemo(() => {
    const open = tasks.filter((t) => t.status === 'open');
    return {
      today: open.filter((t) => isInTodayRange(t.due_at, todayStart, tomorrowStart)).length,
      overdue: open.filter((t) => isOverdue(t.due_at, todayStart)).length,
      week: open.filter((t) => isInWeekRange(t.due_at, todayStart, weekEnd)).length,
      total: open.length,
    };
  }, [tasks, todayStart, tomorrowStart, weekEnd]);

  async function reload(): Promise<TaskWithOwner[] | null> {
    try {
      const res = await fetch('/api/admin/tasks/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: ['open', 'done', 'skipped'], limit: 300 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      const next = (json.tasks as TaskWithOwner[]) ?? [];
      setTasks(next);
      return next;
    } catch (e) {
      showToast(`Reload impossible : ${(e as Error).message}`, 'error');
      return null;
    }
  }

  function handleSaved(task: Task) {
    // Le modal renvoie un Task pur (sans owner_label). On enrichit localement
    // avec le label courant si c'est un edit, sinon on reload.
    const existing = tasks.find((t) => t.id === task.id);
    if (existing) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...task, owner_label: existing.owner_label, owner_slug: existing.owner_slug }
            : t
        )
      );
      showToast('Tâche enregistrée.', 'success');
    } else {
      // Nouveau : on reload pour récupérer owner_label
      void reload();
      showToast('Tâche créée.', 'success');
    }
  }

  function handleDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Tâche supprimée.', 'success');
  }

  async function handleComplete(task: TaskWithOwner) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'done' } : t))
    );
    try {
      const res = await fetch('/api/admin/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, action: 'done' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      // Mise à jour avec la tâche done renvoyée + ajout éventuel de next_task
      setTasks((prev) => {
        const withUpdated = prev.map((t) =>
          t.id === task.id ? { ...t, ...(json.task as Task) } : t
        );
        if (json.next_task) {
          const next: TaskWithOwner = {
            ...(json.next_task as Task),
            owner_label: task.owner_label,
            owner_slug: task.owner_slug,
          };
          return [next, ...withUpdated];
        }
        return withUpdated;
      });
      if (json.next_task) {
        showToast('Tâche terminée. Prochaine occurrence créée.', 'success');
      } else {
        showToast('Tâche terminée.', 'success');
      }
    } catch (e) {
      setTasks(previous);
      showToast(`Erreur : ${(e as Error).message}`, 'error');
    }
  }

  async function handleSkip(task: TaskWithOwner) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'skipped' } : t))
    );
    try {
      const res = await fetch('/api/admin/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, action: 'skipped' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...(json.task as Task) } : t))
      );
      showToast('Tâche ignorée.', 'success');
    } catch (e) {
      setTasks(previous);
      showToast(`Erreur : ${(e as Error).message}`, 'error');
    }
  }

  return (
    <>
      <div className="flex items-end justify-between gap-5 mb-6 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-black text-[#1B2E4A] mb-1">Tâches</h1>
          <p className="text-sm text-[#6B7A90] font-sans">
            {counts.total} ouverte{counts.total > 1 ? 's' : ''} — {counts.today} aujourd'hui, {counts.overdue} en retard
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon />
          Nouvelle tâche
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip
            label="Toutes"
            active={filters.dueRange === 'all'}
            onClick={() => setFilters((f) => ({ ...f, dueRange: 'all' }))}
          />
          <Chip
            label="Aujourd'hui"
            count={counts.today}
            active={filters.dueRange === 'today'}
            onClick={() => setFilters((f) => ({ ...f, dueRange: 'today' }))}
          />
          <Chip
            label="En retard"
            count={counts.overdue}
            active={filters.dueRange === 'overdue'}
            onClick={() => setFilters((f) => ({ ...f, dueRange: 'overdue' }))}
          />
          <Chip
            label="Cette semaine"
            count={counts.week}
            active={filters.dueRange === 'week'}
            onClick={() => setFilters((f) => ({ ...f, dueRange: 'week' }))}
          />

          <span className="mx-1 text-[#E4DED3]" aria-hidden="true">|</span>

          <Chip
            label="Tous types"
            active={filters.ownerType === null}
            onClick={() => setFilters((f) => ({ ...f, ownerType: null }))}
          />
          <Chip
            label="Libres"
            active={filters.ownerType === 'free'}
            onClick={() => setFilters((f) => ({ ...f, ownerType: 'free' }))}
          />
          <Chip
            label="Prospects"
            active={filters.ownerType === 'prospect'}
            onClick={() => setFilters((f) => ({ ...f, ownerType: 'prospect' }))}
          />
          <Chip
            label="Contacts"
            active={filters.ownerType === 'contact'}
            onClick={() => setFilters((f) => ({ ...f, ownerType: 'contact' }))}
          />
          <Chip
            label="Centres"
            active={filters.ownerType === 'centre'}
            onClick={() => setFilters((f) => ({ ...f, ownerType: 'centre' }))}
          />

          <span className="mx-1 text-[#E4DED3]" aria-hidden="true">|</span>

          <Chip
            label="Afficher terminées"
            active={filters.showClosed}
            onClick={() => setFilters((f) => ({ ...f, showClosed: !f.showClosed }))}
          />
        </div>

        <div className="relative max-w-md">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Rechercher dans les tâches…"
            className="w-full pl-9 pr-3 py-2 border border-[#E4DED3] bg-white rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
            aria-label="Rechercher une tâche"
            style={{ minHeight: 40 }}
          />
        </div>
      </div>

      <TasksList
        tasks={filteredTasks}
        onEdit={setEditingTask}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />

      <TaskEditModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        task={null}
        onSaved={handleSaved}
      />

      {editingTask && (
        <TaskEditModal
          isOpen={true}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

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
