// ProspectEditPanel.tsx — formulaire d'édition inline (row expandée).
// Sauvegarde explicite (bouton Enregistrer). Pas d'optimistic update.
// Jalon 2d : ajout bloc Historique + AddInteractionForm en bas.

import { useState } from 'react';
import Button from '../ui/react/Button';
import InteractionsList from './InteractionsList';
import AddInteractionForm from './AddInteractionForm';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCE_LABELS,
  type Prospect,
  type ProspectStatus,
  type ProspectSource,
} from '../../../types/prospect';

interface Props {
  prospect: Prospect;
  onSave: (updated: Prospect) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

interface FormState {
  name: string;
  company: string;
  centres_count: number;
  city: string;
  cp: string;
  departement: string;
  status: ProspectStatus;
  source: ProspectSource;
  is_fondateur: boolean;
  next_action: string;
  next_action_at: string; // datetime-local string (YYYY-MM-DDTHH:mm)
  mrr_potentiel: string; // conservé en string pour l'input
  notes: string;
}

function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Format YYYY-MM-DDTHH:mm (local time, compatible datetime-local)
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function prospectToForm(p: Prospect): FormState {
  return {
    name: p.name,
    company: p.company ?? '',
    centres_count: p.centres_count,
    city: p.city ?? '',
    cp: p.cp ?? '',
    departement: p.departement ?? '',
    status: p.status,
    source: p.source,
    is_fondateur: p.is_fondateur,
    next_action: p.next_action ?? '',
    next_action_at: isoToDatetimeLocal(p.next_action_at),
    mrr_potentiel: p.mrr_potentiel != null ? String(p.mrr_potentiel) : '',
    notes: p.notes ?? '',
  };
}

function formatMeta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProspectEditPanel({ prospect, onSave, onCancel, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(prospectToForm(prospect));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleInteractionAdded() {
    setReloadKey((k) => k + 1);
  }

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        id: prospect.id,
        name: form.name,
        company: form.company || null,
        centres_count: form.centres_count,
        city: form.city || null,
        cp: form.cp || null,
        departement: form.departement || null,
        status: form.status,
        source: form.source,
        is_fondateur: form.is_fondateur,
        next_action: form.next_action || null,
        next_action_at: form.next_action_at || null,
        mrr_potentiel: form.mrr_potentiel === '' ? null : Number(form.mrr_potentiel),
        notes: form.notes || null,
      };
      const res = await fetch('/api/admin/prospects/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      onSave(json.prospect as Prospect);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Supprimer ce prospect ? Action irréversible.')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prospects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prospect.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur serveur');
      onDelete(prospect.id);
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  const inputCls =
    'w-full border border-[#E4DED3] bg-white px-2.5 py-2 rounded-md text-sm font-sans text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]';
  const labelCls =
    'block text-[11px] font-semibold text-[#6B7A90] uppercase tracking-[0.06em] mb-1 font-sans';

  return (
    <div className="bg-[#FDFBF7] border-b border-[#E4DED3] px-5 py-5 font-sans">
      {error && (
        <div className="text-[#B34444] text-sm mb-3 bg-[#F6E3E3] border border-[#B34444]/20 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Nom complet *</label>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            aria-label="Nom complet"
          />
        </div>

        <div>
          <label className={labelCls}>Entité / Groupe</label>
          <input
            className={inputCls}
            value={form.company}
            onChange={(e) => update('company', e.target.value)}
            placeholder="Centres Athuil, Audition Juan Les Pins…"
            aria-label="Entité ou groupe"
          />
        </div>

        <div>
          <label className={labelCls}>Nombre de centres</label>
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
          <label className={labelCls}>Statut</label>
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
          <label className={labelCls}>Source</label>
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
          <label className={labelCls}>MRR potentiel (€/mois)</label>
          <input
            className={inputCls}
            type="number"
            step="0.01"
            min={0}
            value={form.mrr_potentiel}
            onChange={(e) => update('mrr_potentiel', e.target.value)}
            placeholder="456.00"
            aria-label="Montant MRR potentiel en euros par mois"
          />
        </div>

        <div>
          <label className={labelCls}>Prochaine action</label>
          <input
            className={inputCls}
            value={form.next_action}
            onChange={(e) => update('next_action', e.target.value)}
            placeholder="Call découverte, Envoyer brief Fondateur…"
            aria-label="Prochaine action"
          />
        </div>

        <div>
          <label className={labelCls}>Date / heure</label>
          <input
            className={inputCls}
            type="datetime-local"
            value={form.next_action_at}
            onChange={(e) => update('next_action_at', e.target.value)}
            aria-label="Date et heure de la prochaine action"
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea
            className={`${inputCls} resize-y min-h-[70px] leading-relaxed`}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            aria-label="Notes"
          />
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            onClick={() => update('is_fondateur', !form.is_fondateur)}
            className={
              form.is_fondateur
                ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-sans font-medium text-[#D97B3D] bg-[#FBEEE2] border border-dashed border-[#D97B3D] cursor-pointer'
                : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-sans font-medium text-[#6B7A90] bg-transparent border border-dashed border-[#E4DED3] cursor-pointer hover:border-[#6B7A90]'
            }
          >
            {form.is_fondateur ? 'Partenaire Fondateur actif' : 'Non-Fondateur'}
          </button>
        </div>

        <div className="md:col-span-2 mt-2">
          <label className={labelCls}>Historique</label>
          <InteractionsList prospectId={prospect.id} reloadKey={reloadKey} />
          <AddInteractionForm prospectId={prospect.id} onAdded={handleInteractionAdded} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 mt-4 border-t border-dashed border-[#E4DED3] items-center">
        <span className="mr-auto text-xs text-[#6B7A90] font-sans">
          Créé le {formatMeta(prospect.created_at)} · MAJ le {formatMeta(prospect.updated_at)}
        </span>
        <Button variant="cancel" onClick={onCancel} disabled={loading}>
          Annuler
        </Button>
        <Button variant="save" onClick={handleSave} disabled={loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button
          variant="ghost"
          onClick={handleDelete}
          disabled={loading}
          className="!text-[#B34444] hover:!bg-[#F6E3E3] !border-[#F6E3E3]"
        >
          Supprimer
        </Button>
      </div>
    </div>
  );
}
