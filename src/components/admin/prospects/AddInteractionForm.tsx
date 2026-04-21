// AddInteractionForm.tsx — form pour logger une interaction.
// Phase 5.0 : support transcripts Meet/Call (textarea XXL + layout colonne).
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

// Exclut status_change (réservé Phase 3 /move auto).
// Inclut transcript_meet + transcript_call (Phase 5.0).
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

export default function AddInteractionForm({ prospectId, onAdded }: Props) {
  const [kind, setKind] = useState<InteractionKind>('note');
  const [content, setContent] = useState('');
  const [occurredAt, setOccurredAt] = useState<string>(nowAsDatetimeLocal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTranscript = kind === 'transcript_meet' || kind === 'transcript_call';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError('Contenu requis.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
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
      setContent('');
      setKind('note');
      setOccurredAt(nowAsDatetimeLocal());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'border border-[#E4DED3] bg-white px-2 py-1.5 rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]';

  return (
    <form onSubmit={handleSubmit} className="mt-2 font-sans">
      {error && (
        <div className="text-[#B34444] text-xs mb-2 font-sans">{error}</div>
      )}

      {isTranscript ? (
        // Layout colonne pour les transcripts (textarea XXL)
        <div className="flex flex-col gap-2">
          <div className="flex gap-2 flex-wrap items-center">
            <select
              className={`${inputCls} w-44`}
              value={kind}
              onChange={(e) => setKind(e.target.value as InteractionKind)}
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
        // Layout compact row (inchangé depuis Phase 2d)
        <div className="flex flex-wrap gap-2 items-start">
          <select
            className={`${inputCls} w-28`}
            value={kind}
            onChange={(e) => setKind(e.target.value as InteractionKind)}
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
      )}
    </form>
  );
}
