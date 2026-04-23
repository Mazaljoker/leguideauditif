// TaskEditModal.tsx — modal create + edit pour une tâche.
// Un seul composant, mode create si task.id est null, edit sinon.

import { useEffect, useState } from 'react';
import Button from '../ui/react/Button';
import TaskOwnerAutocomplete from './TaskOwnerAutocomplete';
import {
  TASK_RECURRENCE_LABELS,
  TASK_OWNER_TYPE_LABELS,
  TASK_CATEGORY_LABELS,
  type Task,
  type TaskOwnerType,
  type TaskRecurrenceKind,
  type TaskCategory,
  type TaskWithOwner,
} from '../../../types/task';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // null = create, sinon edit
  task: TaskWithOwner | null;
  // Prefill pour mode create
  prefillOwnerType?: TaskOwnerType | null;
  prefillOwnerId?: string | null;
  prefillOwnerLabel?: string | null;
  onSaved: (task: Task) => void;
  onDeleted?: (id: string) => void;
}

interface FormState {
  title: string;
  description: string;
  ownerType: TaskOwnerType | null;
  ownerId: string | null;
  ownerLabel: string | null;
  dueAt: string; // datetime-local (YYYY-MM-DDTHH:mm)
  recurrenceKind: TaskRecurrenceKind;
  category: TaskCategory;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function TaskEditModal({
  isOpen,
  onClose,
  task,
  prefillOwnerType = null,
  prefillOwnerId = null,
  prefillOwnerLabel = null,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = !!task?.id;

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    ownerType: null,
    ownerId: null,
    ownerLabel: null,
    dueAt: '',
    recurrenceKind: 'none',
    category: 'todo',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        ownerType: task.owner_type,
        ownerId: task.owner_id,
        ownerLabel: task.owner_label,
        dueAt: isoToDatetimeLocal(task.due_at),
        recurrenceKind: task.recurrence_kind,
        category: task.category,
      });
    } else {
      setForm({
        title: '',
        description: '',
        ownerType: prefillOwnerType,
        ownerId: prefillOwnerId,
        ownerLabel: prefillOwnerLabel,
        dueAt: '',
        recurrenceKind: 'none',
        category: 'todo',
      });
    }
    setError(null);
  }, [isOpen, task, prefillOwnerType, prefillOwnerId, prefillOwnerLabel]);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleOwnerTypeChange(next: TaskOwnerType | null) {
    setForm((f) => ({
      ...f,
      ownerType: next,
      ownerId: null,
      ownerLabel: null,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Le titre est requis.');
      return;
    }
    if (form.ownerType && !form.ownerId) {
      setError(`Choisis un ${form.ownerType} dans la liste.`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...(isEdit ? { id: task!.id } : {}),
        title: form.title.trim(),
        description: form.description.trim() || null,
        owner_type: form.ownerType,
        owner_id: form.ownerId,
        due_at: datetimeLocalToIso(form.dueAt),
        recurrence_kind: form.recurrenceKind,
        category: form.category,
      };
      const res = await fetch(
        isEdit ? '/api/admin/tasks/update' : '/api/admin/tasks/create',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      onSaved(json.task as Task);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !task) return;
    if (!confirm('Supprimer cette tâche ?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tasks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      onDeleted?.(task.id);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full border border-[#E4DED3] bg-white px-2.5 py-2 rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]';
  const labelCls =
    'block text-[11px] font-semibold text-[#6B7A90] uppercase tracking-[0.06em] mb-1 font-sans';

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-stretch md:items-center justify-center md:p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
    >
      <div
        className="bg-white md:rounded-xl w-full md:max-w-lg p-5 md:p-6 relative shadow-2xl md:max-h-[90vh] md:overflow-y-auto font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 text-[#6B7A90] hover:text-[#1B2E4A] p-2 rounded-lg"
        >
          <CloseIcon />
        </button>

        <h2 className="font-serif text-2xl font-black text-[#1B2E4A] mb-4">
          {isEdit ? 'Modifier la tâche' : 'Nouvelle tâche'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="text-[#B34444] text-sm bg-[#F6E3E3] border border-[#B34444]/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>
              Titre <span className="text-[#B34444]">*</span>
            </label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              required
              autoFocus
              maxLength={500}
              aria-label="Titre de la tâche"
            />
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              className={`${inputCls} resize-y min-h-[60px] leading-relaxed`}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              maxLength={5000}
              aria-label="Description"
            />
          </div>

          <div>
            <label className={labelCls}>Attaché à</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleOwnerTypeChange(null)}
                className={
                  form.ownerType === null
                    ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1B2E4A] text-white'
                    : 'px-3 py-1.5 rounded-full text-xs font-medium border border-[#E4DED3] text-[#6B7A90] hover:bg-[#E8ECF2]'
                }
              >
                Libre
              </button>
              {(['prospect', 'contact', 'centre'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleOwnerTypeChange(t)}
                  className={
                    form.ownerType === t
                      ? 'px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1B2E4A] text-white'
                      : 'px-3 py-1.5 rounded-full text-xs font-medium border border-[#E4DED3] text-[#6B7A90] hover:bg-[#E8ECF2]'
                  }
                >
                  {TASK_OWNER_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            {form.ownerType && (
              <TaskOwnerAutocomplete
                ownerType={form.ownerType}
                currentLabel={form.ownerLabel}
                onSelect={(id, label) => {
                  setForm((f) => ({ ...f, ownerId: id, ownerLabel: label }));
                }}
              />
            )}
            {form.ownerType && form.ownerId && (
              <a
                href={
                  form.ownerType === 'prospect'
                    ? `/admin/prospects/?open=${form.ownerId}`
                    : form.ownerType === 'contact'
                      ? `/admin/contacts/?open=${form.ownerId}`
                      : `/admin/centres/`
                }
                className="inline-flex items-center gap-1 mt-2 text-xs text-[#D97B3D] font-semibold hover:underline"
                title={`Ouvrir la fiche ${TASK_OWNER_TYPE_LABELS[form.ownerType].toLowerCase()}`}
              >
                Ouvrir la fiche {TASK_OWNER_TYPE_LABELS[form.ownerType].toLowerCase()} →
              </a>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Catégorie</label>
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => update('category', e.target.value as TaskCategory)}
                aria-label="Catégorie"
              >
                {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {TASK_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Échéance</label>
              <input
                className={inputCls}
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => update('dueAt', e.target.value)}
                aria-label="Échéance"
              />
            </div>
            <div>
              <label className={labelCls}>Récurrence</label>
              <select
                className={inputCls}
                value={form.recurrenceKind}
                onChange={(e) => update('recurrenceKind', e.target.value as TaskRecurrenceKind)}
                aria-label="Récurrence"
              >
                {(Object.keys(TASK_RECURRENCE_LABELS) as TaskRecurrenceKind[]).map((k) => (
                  <option key={k} value={k}>
                    {TASK_RECURRENCE_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-3 border-t border-dashed border-[#E4DED3] mt-1 flex-wrap">
            <div>
              {isEdit && onDeleted && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-2 text-[13px] text-[#B34444] hover:bg-[#F6E3E3] rounded-lg font-semibold"
                  style={{ minHeight: 44 }}
                >
                  Supprimer
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="cancel" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button variant="save" type="submit" disabled={loading}>
                {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
