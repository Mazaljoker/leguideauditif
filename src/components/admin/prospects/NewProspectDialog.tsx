// NewProspectDialog.tsx — modal de création d'un prospect.
// Form mono-colonne. Submit POST /api/admin/prospects/create.

import { useEffect, useState } from 'react';
import Button from '../ui/react/Button';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCE_LABELS,
  type Prospect,
  type ProspectStatus,
  type ProspectSource,
} from '../../../types/prospect';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (prospect: Prospect) => void;
}

interface FormState {
  name: string;
  company: string;
  centres_count: number;
  city: string;
  cp: string;
  departement: string;
  source: ProspectSource;
  status: ProspectStatus;
  is_fondateur: boolean;
  mrr_potentiel: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  company: '',
  centres_count: 1,
  city: '',
  cp: '',
  departement: '',
  source: 'autre',
  status: 'prospect',
  is_fondateur: false,
  mrr_potentiel: '',
  notes: '',
};

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

export default function NewProspectDialog({ isOpen, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        company: form.company || null,
        centres_count: form.centres_count,
        city: form.city || null,
        cp: form.cp || null,
        departement: form.departement || null,
        status: form.status,
        source: form.source,
        is_fondateur: form.is_fondateur,
        mrr_potentiel: form.mrr_potentiel === '' ? null : Number(form.mrr_potentiel),
        notes: form.notes || null,
      };
      const res = await fetch('/api/admin/prospects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      onCreated(json.prospect as Prospect);
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
      aria-label="Nouveau prospect"
    >
      <div
        className="bg-white md:rounded-xl w-full md:max-w-md p-5 md:p-6 relative shadow-2xl md:max-h-[90vh] md:overflow-y-auto font-sans"
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

        <h2 className="font-serif text-2xl font-black text-[#1B2E4A] mb-1">Nouveau prospect</h2>
        <p className="text-sm text-[#6B7A90] mb-4">
          Les champs marqués <span className="text-[#B34444]">*</span> sont obligatoires.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {error && (
            <div className="text-[#B34444] text-sm bg-[#F6E3E3] border border-[#B34444]/20 rounded px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className={labelCls}>
              Nom complet <span className="text-[#B34444]">*</span>
            </label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              autoFocus
              aria-label="Nom complet"
            />
          </div>

          <div>
            <label className={labelCls}>Entité / Groupe</label>
            <input
              className={inputCls}
              value={form.company}
              onChange={(e) => update('company', e.target.value)}
              aria-label="Entité ou groupe"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Nb centres</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                value={form.centres_count}
                onChange={(e) => update('centres_count', Math.max(1, Number(e.target.value) || 1))}
                aria-label="Nombre de centres"
              />
            </div>
            <div>
              <label className={labelCls}>CP</label>
              <input
                className={inputCls}
                value={form.cp}
                onChange={(e) => update('cp', e.target.value)}
                aria-label="Code postal"
              />
            </div>
            <div>
              <label className={labelCls}>Dépt</label>
              <input
                className={inputCls}
                value={form.departement}
                onChange={(e) => update('departement', e.target.value)}
                maxLength={3}
                aria-label="Département"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Ville</label>
            <input
              className={inputCls}
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              aria-label="Ville"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Source <span className="text-[#B34444]">*</span>
              </label>
              <select
                className={inputCls}
                value={form.source}
                onChange={(e) => update('source', e.target.value as ProspectSource)}
                aria-label="Canal d'acquisition"
              >
                {(Object.keys(PROSPECT_SOURCE_LABELS) as ProspectSource[]).map((s) => (
                  <option key={s} value={s}>
                    {PROSPECT_SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Statut <span className="text-[#B34444]">*</span>
              </label>
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => update('status', e.target.value as ProspectStatus)}
                aria-label="Statut du prospect"
              >
                {(Object.keys(PROSPECT_STATUS_LABELS) as ProspectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {PROSPECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => update('is_fondateur', !form.is_fondateur)}
              className={
                form.is_fondateur
                  ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-[#D97B3D] bg-[#FBEEE2] border border-dashed border-[#D97B3D] cursor-pointer'
                  : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-[#6B7A90] bg-transparent border border-dashed border-[#E4DED3] cursor-pointer hover:border-[#6B7A90]'
              }
            >
              {form.is_fondateur ? 'Partenaire Fondateur' : 'Non-Fondateur'}
            </button>
          </div>

          <div className="rounded-lg border border-dashed border-[#E4DED3] bg-[#FDFBF7] p-3 text-[12px] text-[#6B7A90]">
            Une fois le prospect créé, ajoute une tâche depuis la
            page <a href="/admin/tasks" className="text-[#D97B3D] font-semibold hover:underline">Tâches</a>.
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              className={`${inputCls} resize-y min-h-[60px] leading-relaxed`}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              aria-label="Notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-dashed border-[#E4DED3] mt-1">
            <Button variant="cancel" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button variant="save" type="submit" disabled={loading}>
              {loading ? 'Création…' : 'Créer le prospect'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
