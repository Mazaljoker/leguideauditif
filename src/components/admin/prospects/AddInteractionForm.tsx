// AddInteractionForm.tsx — form pour logger une interaction.
// Phase 5.0 : support transcripts Meet/Call (textarea XXL).
// Phase 6 : checkbox "Créer une tâche de suivi" sur TOUS les kinds,
//           avec catégorie (appel/e-mail/inmail/todo) + titre libre.

import { useState } from 'react';
import Button from '../ui/react/Button';
import {
  INTERACTION_KIND_LABELS,
  type Interaction,
  type InteractionKind,
} from '../../../types/prospect';
import { TASK_CATEGORY_LABELS, type TaskCategory } from '../../../types/task';

interface Props {
  prospectId: string;
  prospectName?: string;
  onAdded: (interaction: Interaction) => void;
}

const EDITABLE_KINDS: InteractionKind[] = [
  'note',
  'call',
  'email',
  'dm',
  'meeting',
  'transcript_meet',
  'transcript_call',
];

// Valeurs par défaut de catégorie/case selon le kind d'interaction.
const KIND_DEFAULTS: Record<InteractionKind, { createTask: boolean; category: TaskCategory }> = {
  note:              { createTask: true,  category: 'todo'   },
  call:              { createTask: false, category: 'call'   },
  email:             { createTask: false, category: 'email'  },
  dm:                { createTask: false, category: 'inmail' },
  meeting:           { createTask: false, category: 'todo'   },
  transcript_meet:   { createTask: false, category: 'todo'   },
  transcript_call:   { createTask: false, category: 'call'   },
  status_change:     { createTask: false, category: 'todo'   }, // jamais saisi à la main
};

function nowAsDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTaskDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function suggestedTaskTitle(
  kind: InteractionKind,
  category: TaskCategory,
  prospectName: string | undefined
): string {
  const who = prospectName?.trim() || 'ce prospect';
  const actionByCategory: Record<TaskCategory, string> = {
    call: `Rappeler ${who}`,
    email: `Envoyer e-mail à ${who}`,
    inmail: `Envoyer InMail à ${who}`,
    todo: `Suivi ${who}`,
  };
  // Cas spécifiques pour que le titre soit parlant
  if (kind === 'meeting') return `Suivi RDV ${who}`;
  if (kind === 'transcript_meet') return `Actions suite au RDV ${who}`;
  if (kind === 'transcript_call') return `Actions suite à l'appel ${who}`;
  return actionByCategory[category];
}

export default function AddInteractionForm({ prospectId, prospectName, onAdded }: Props) {
  const [kind, setKind] = useState<InteractionKind>('note');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState<string>(nowAsDatetimeLocal());
  const [createTask, setCreateTask] = useState<boolean>(KIND_DEFAULTS.note.createTask);
  const [taskCategory, setTaskCategory] = useState<TaskCategory>(KIND_DEFAULTS.note.category);
  const [taskTitle, setTaskTitle] = useState<string>(
    suggestedTaskTitle('note', KIND_DEFAULTS.note.category, prospectName)
  );
  const [taskTitleTouched, setTaskTitleTouched] = useState(false);
  const [taskDueAt, setTaskDueAt] = useState<string>(defaultTaskDueDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskWarning, setTaskWarning] = useState<string | null>(null);

  const isTranscript = kind === 'transcript_meet' || kind === 'transcript_call';

  function handleKindChange(next: InteractionKind) {
    setKind(next);
    const defaults = KIND_DEFAULTS[next];
    setCreateTask(defaults.createTask);
    setTaskCategory(defaults.category);
    // Régénère le titre suggéré UNIQUEMENT si l'utilisateur n'a rien tapé manuellement
    if (!taskTitleTouched) {
      setTaskTitle(suggestedTaskTitle(next, defaults.category, prospectName));
    }
  }

  function handleCategoryChange(next: TaskCategory) {
    setTaskCategory(next);
    if (!taskTitleTouched) {
      setTaskTitle(suggestedTaskTitle(kind, next, prospectName));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError('Contenu requis.');
      return;
    }
    if (createTask && !taskTitle.trim()) {
      setError('Titre de la tâche requis (ou décoche la case).');
      return;
    }
    setLoading(true);
    setError(null);
    setTaskWarning(null);
    try {
      // 1) Créer l'interaction
      const res = await fetch('/api/admin/prospects/interactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospect_id: prospectId,
          kind,
          content: content.trim(),
          occurred_at: occurredAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      onAdded(json.interaction as Interaction);

      // 2) Créer la tâche si demandé (non-bloquant en cas d'échec)
      if (createTask) {
        try {
          const taskRes = await fetch('/api/admin/tasks/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: taskTitle.trim(),
              owner_type: 'prospect',
              owner_id: prospectId,
              due_at: taskDueAt || null,
              recurrence_kind: 'none',
              category: taskCategory,
            }),
          });
          const taskJson = await taskRes.json();
          if (!taskRes.ok) {
            setTaskWarning(
              `Interaction ajoutée, mais tâche non créée : ${taskJson.error ?? 'erreur inconnue'}`
            );
          }
        } catch (err) {
          setTaskWarning(
            `Interaction ajoutée, mais tâche non créée : ${(err as Error).message}`
          );
        }
      }

      // Reset formulaire (kind reste sur 'note' par défaut)
      setContent('');
      setKind('note');
      setOccurredAt(nowAsDatetimeLocal());
      const d = KIND_DEFAULTS.note;
      setCreateTask(d.createTask);
      setTaskCategory(d.category);
      setTaskTitle(suggestedTaskTitle('note', d.category, prospectName));
      setTaskTitleTouched(false);
      setTaskDueAt(defaultTaskDueDate());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'border border-[#E4DED3] bg-white px-2 py-1.5 rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]';

  const taskBlock = (
    <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-dashed border-[#E4DED3]">
      <label className="inline-flex items-center gap-2 text-xs text-[#1B2E4A] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={createTask}
          onChange={(e) => setCreateTask(e.target.checked)}
          className="w-4 h-4 accent-[#D97B3D]"
          aria-label="Créer une tâche de suivi"
        />
        <span className="font-medium">Créer une tâche de suivi</span>
      </label>
      {createTask && (
        <div className="flex flex-wrap gap-2 items-center pl-6">
          <select
            className={`${inputCls} w-32`}
            value={taskCategory}
            onChange={(e) => handleCategoryChange(e.target.value as TaskCategory)}
            aria-label="Catégorie de la tâche"
          >
            {(Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]).map((c) => (
              <option key={c} value={c}>
                {TASK_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            className={`${inputCls} flex-1 min-w-[220px]`}
            type="text"
            value={taskTitle}
            onChange={(e) => {
              setTaskTitle(e.target.value);
              setTaskTitleTouched(true);
            }}
            placeholder="Titre de la tâche…"
            maxLength={500}
            aria-label="Titre de la tâche"
          />
          <input
            className={`${inputCls} w-48`}
            type="datetime-local"
            value={taskDueAt}
            onChange={(e) => setTaskDueAt(e.target.value)}
            aria-label="Échéance de la tâche"
          />
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="mt-2 font-sans">
      {error && (
        <div className="text-[#B34444] text-xs mb-2 font-sans">{error}</div>
      )}
      {taskWarning && (
        <div className="text-[#B8761F] text-xs mb-2 font-sans">{taskWarning}</div>
      )}

      {isTranscript ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              className={`${inputCls} w-44`}
              value={kind}
              onChange={(e) => handleKindChange(e.target.value as InteractionKind)}
              aria-label="Type d'interaction"
            >
              {EDITABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {INTERACTION_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <input
              className={`${inputCls} w-48`}
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              aria-label="Date de l'interaction"
            />
            <Button variant="save" type="submit" disabled={loading}>
              {loading ? 'Ajout…' : 'Ajouter'}
            </Button>
          </div>
          <textarea
            className={`${inputCls} w-full min-h-[200px] resize-y leading-relaxed`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Colle la transcription ici…"
            rows={8}
            aria-label="Transcription"
          />
          {taskBlock}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 items-start">
            <select
              className={`${inputCls} w-28`}
              value={kind}
              onChange={(e) => handleKindChange(e.target.value as InteractionKind)}
              aria-label="Type d'interaction"
            >
              {EDITABLE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {INTERACTION_KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <textarea
              className={`${inputCls} flex-1 min-w-[200px] min-h-[36px] resize-y`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Noter en 1 phrase…"
              rows={1}
              aria-label="Contenu de l'interaction"
            />
            <input
              className={`${inputCls} w-48`}
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              aria-label="Date de l'interaction"
            />
            <Button variant="save" type="submit" disabled={loading}>
              {loading ? 'Ajout…' : 'Ajouter'}
            </Button>
          </div>
          {taskBlock}
        </>
      )}
    </form>
  );
}
