// AddInteractionForm.tsx — form compact pour logger une interaction.
// status_change volontairement exclu : réservé aux mouvements kanban auto (Phase 3).

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

// Exclut status_change de la liste éditable (Phase 3 le gère via /move)
const EDITABLE_KINDS: InteractionKind[] = ['dm', 'call', 'email', 'note', 'meeting'];

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
      // Reset
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
    </form>
  );
}
