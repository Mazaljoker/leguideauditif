// ProspectFormFields.tsx — formulaire d'édition (Phase 5.0).
// Utilisé dans l'onglet "Info" du ProspectEditModal (vue Pipeline).
// Identique au form de ProspectEditPanel mais SANS le bloc historique
// (séparé dans l'onglet "Historique" du modal).

import { useState } from 'react';
import Button from '../ui/react/Button';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCE_LABELS,
  type Prospect,
  type ProspectStatus,
  type ProspectSource,
} from '../../../types/prospect';
import { TASK_CATEGORY_LABELS, type Task } from '../../../types/task';
import { classifyNextAction } from '../../../lib/prospects';

interface Props {
  prospect: Prospect;
  nextTask?: Task | null;
  onSaved: (updated: Prospect) => void;
  onCancel: () => void;
  onDeleted: (id: string) => void;
  onEditTask?: (task: Task) => void;
  onCreateTask?: () => void;
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
  is_apporteur: boolean;
  mrr_potentiel: string;
  notes: string;
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
    is_apporteur: p.is_apporteur,
    mrr_potentiel: p.mrr_potentiel != null ? String(p.mrr_potentiel) : '',
    notes: p.notes ?? '',
  };
}

function formatMeta(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ProspectFormFields({
  prospect,
  nextTask,
  onSaved,
  onCancel,
  onDeleted,
  onEditTask,
  onCreateTask,
}: Props) {
  const [form, setForm] = useState<FormState>(prospectToForm(prospect));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
        is_apporteur: form.is_apporteur,
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
      onSaved(json.prospect as Prospect);
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
      onDeleted(prospect.id);
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
    <div className="font-sans">
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

        <div className="md:col-span-2">
          <NextActionBlock
            task={nextTask ?? null}
            onEditTask={onEditTask}
            onCreateTask={onCreateTask}
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

        <div className="md:col-span-2 flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={() => update('is_apporteur', !form.is_apporteur)}
            className={
              form.is_apporteur
                ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-sans font-medium text-[#0C447C] bg-[#E6F1FB] border border-dashed border-[#0C447C] cursor-pointer'
                : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-sans font-medium text-[#6B7A90] bg-transparent border border-dashed border-[#E4DED3] cursor-pointer hover:border-[#6B7A90]'
            }
            title="Contact commercial / apporteur d'affaires (sans centre client)"
          >
            {form.is_apporteur ? 'Apporteur d’affaires' : 'Non-Apporteur'}
          </button>
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

// ---------- NextActionBlock ----------
// Affiche la prochaine tâche ouverte du prospect (ou CTA création si aucune).

function NextActionBlock({
  task,
  onEditTask,
  onCreateTask,
}: {
  task: Task | null;
  onEditTask?: (task: Task) => void;
  onCreateTask?: () => void;
}) {
  if (!task) {
    return (
      <div className="rounded-lg border border-dashed border-[#E4DED3] bg-[#FDFBF7] p-3 text-sm flex flex-wrap items-center justify-between gap-2 font-sans">
        <span className="text-[12px] text-[#6B7A90]">
          <strong className="text-[#1B2E4A]">Prochaine action</strong> — aucune tâche
          ouverte pour ce prospect.
        </span>
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className="text-[#D97B3D] font-semibold text-xs hover:underline"
          >
            + Créer une tâche
          </button>
        )}
      </div>
    );
  }

  const temporal = classifyNextAction(task.due_at);
  const dateCls =
    temporal === 'overdue'
      ? 'text-[#B34444] font-semibold'
      : temporal === 'today'
        ? 'text-[#D97B3D] font-semibold'
        : 'text-[#6B7A90]';

  const dueLabel = task.due_at
    ? (() => {
        const d = new Date(task.due_at);
        const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        if (temporal === 'overdue') return `En retard — ${dateStr} ${timeStr}`;
        if (temporal === 'today') return `Aujourd'hui ${timeStr}`;
        return `${dateStr} ${timeStr}`;
      })()
    : 'Pas de date';

  return (
    <div className="rounded-lg border border-[#E4DED3] bg-[#FDFBF7] p-3 flex items-start justify-between gap-3 font-sans">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-[#6B7A90] uppercase tracking-wide mb-0.5">
          Prochaine action · {TASK_CATEGORY_LABELS[task.category]}
        </div>
        <div className="font-semibold text-sm text-[#1B2E4A] truncate">{task.title}</div>
        <div className={`text-xs mt-0.5 ${dateCls}`}>{dueLabel}</div>
      </div>
      {onEditTask && (
        <button
          type="button"
          onClick={() => onEditTask(task)}
          className="text-[#D97B3D] font-semibold text-xs hover:underline flex-shrink-0"
        >
          Modifier
        </button>
      )}
    </div>
  );
}
