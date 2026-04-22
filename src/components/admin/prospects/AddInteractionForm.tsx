// AddInteractionForm.tsx — form pour logger une interaction.
// Phase 5.0 : support transcripts Meet/Call (textarea XXL + layout colonne).
// Phase 6 : checkbox "Créer une tâche de suivi" (défaut coché pour les notes)
//           qui crée automatiquement une Task liée au prospect à +7 jours.
// status_change volontairement exclu : réservé aux mouvements kanban auto.

import { useState } from 'react';
import Button from '../ui/react/Button';
import {
  INTERACTION_KIND_LABELS,
  type Interaction,
  type InteractionKind,
} from '../../../types/prospect';

interface Props {
  prospectId: string;
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

function nowAsDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTaskDueDate(): string {
  // +7 jours à 09:00 local
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncateTaskTitle(content: string): string {
  const oneLine = content.trim().replace(/\s+/g, ' ');
  return oneLine.length > 120 ? oneLine.slice(0, 117) + '…' : oneLine;
}

export default function AddInteractionForm({ prospectId, onAdded }: Props) {
  const [kind, setKind] = useState<InteractionKind>('note');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState<string>(nowAsDatetimeLocal());
  const [createTask, setCreateTask] = useState<boolean>(true);
  const [taskDueAt, setTaskDueAt] = useState<string>(defaultTaskDueDate());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskWarning, setTaskWarning] = useState<string | null>(null);

  const isTranscript = kind === 'transcript_meet' || kind === 'transcript_call';
  const canCreateTask = !isTranscript;

  function handleKindChange(next: InteractionKind) {
    setKind(next);
    // Défaut : tâche cochée pour note, décochée pour les autres kinds
    if (next === 'note') setCreateTask(true);
    else if (next === 'transcript_meet' || next === 'transcript_call') setCreateTask(false);
    else setCreateTask(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError('Contenu requis.');
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

      // 2) Créer la tâche liée si demandé. Erreur tâche non-bloquante pour l'UX :
      // l'interaction est déjà loggée, on signale juste un warning.
      if (canCreateTask && createTask) {
        try {
          const taskRes = await fetch('/api/admin/tasks/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: truncateTaskTitle(content),
              owner_type: 'prospect',
              owner_id: prospectId,
              due_at: taskDueAt || null,
              recurrence_kind: 'none',
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

      // Reset formulaire
      setContent('');
      setKind('note');
      setOccurredAt(nowAsDatetimeLocal());
      setCreateTask(true);
      setTaskDueAt(defaultTaskDueDate());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'border border-[#E4DED3] bg-white px-2 py-1.5 rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]';

  const taskRow = canCreateTask && (
    <div className="flex flex-wrap gap-3 items-center pt-2 mt-1 border-t border-dashed border-[#E4DED3]">
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
        <>
          <label className="text-xs text-[#6B7A90]" htmlFor="task-due-at">
            Échéance :
          </label>
          <input
            id="task-due-at"
            className={`${inputCls} w-48`}
            type="datetime-local"
            value={taskDueAt}
            onChange={(e) => setTaskDueAt(e.target.value)}
            aria-label="Échéance de la tâche"
          />
        </>
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
        // Layout colonne pour les transcripts (textarea XXL, pas de tâche)
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
          {taskRow}
        </>
      )}
    </form>
  );
}
