# Specs Phase 1 — Admin UI

**Projet** : LeGuideAuditif.fr — Pipeline Email Revendicateurs
**Fichier** : `specs-phase1-admin.md`
**Document parent** : `prd-email-pipeline-revendicateurs.md` v1.1
**Dépend de** : `specs-phase1-data.md` + `specs-phase1-endpoints.md` (doivent être exécutés avant)
**Version** : v1.0
**Statut** : Prêt pour exécution Claude Code

---

## Vue d'ensemble

Ce document spécifie les évolutions UI de la console admin pour la Phase 1.

### Pages modifiées / créées

| Page | Fichier | Action |
|---|---|---|
| `/admin/claims` | `src/pages/admin/claims.astro` | **Refonte complète** — passe de "claims par centre" à "audios avec leurs centres" |
| `/admin/claims/[audiopro_id]` | `src/pages/admin/claims/[audiopro_id].astro` | **Nouveau** — fiche détail audio |

### Composants nouveaux

Tous dans `src/components/admin/` (sous-dossier à créer s'il n'existe pas) :

| Composant | Fichier | Type |
|---|---|---|
| Badge lifecycle stage | `AudioproStageBadge.astro` | Astro |
| Dropdown "Relancer email" | `RelanceEmailDropdown.tsx` | React |
| Modal confirmation relance | `RelanceConfirmModal.tsx` | React |
| Bouton "Promouvoir en prospect" | `PromoteProspectButton.tsx` | React |
| Timeline emails | `EmailEventsTimeline.astro` | Astro |
| Timeline lifecycle events | `LifecycleEventsTimeline.astro` | Astro |
| Filtres liste | `AudioproListFilters.tsx` | React |

### Design system

Rappel (cf. `CLAUDE.md`) :
- Marine `#1B2E4A` | Crème `#F8F5F0` | Orange `#D97B3D`
- Inter + Merriweather, base 18px
- Pas d'emoji Unicode — uniquement `astro-icon` avec set `lucide`
- Tailwind v4

---

## 1. Refonte `/admin/claims`

**Fichier** : `src/pages/admin/claims.astro`

### 1.1 Changement de paradigme

**Avant** : une ligne = un centre avec son statut de claim. Un audio comme Anthony (3 centres) apparaît sur 3 lignes.

**Après** : une ligne = un audio (identifié par email). Les centres sont affichés en agrégat. Anthony apparaît sur 1 ligne avec "3 centres".

### 1.2 Structure de la page (SSR)

**Imports principaux** :

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import { createServerClient } from '../../lib/supabase';
import { getAudioproList } from '../../lib/audiopro-lifecycle';
import AudioproStageBadge from '../../components/admin/AudioproStageBadge.astro';
import AudioproListFilters from '../../components/admin/AudioproListFilters.tsx';
import RelanceEmailDropdown from '../../components/admin/RelanceEmailDropdown.tsx';
import { Icon } from 'astro-icon/components';
import type {
  LifecycleStage,
  AudioproListRow,
} from '../../types/audiopro-lifecycle';

// --- Auth admin ---
// Réutiliser le pattern des autres pages admin

// --- Parse query params pour filtres ---
const url = Astro.url;
const stage_filter = url.searchParams.getAll('stage') as LifecycleStage[];
const has_prospect_param = url.searchParams.get('has_prospect');
const has_prospect = has_prospect_param === 'true' ? true
                   : has_prospect_param === 'false' ? false
                   : null;
const completeness_min = Number(url.searchParams.get('comp_min') ?? 0);
const completeness_max = Number(url.searchParams.get('comp_max') ?? 100);
const search = url.searchParams.get('q') ?? '';

const supabase = createServerClient();

// --- Fetch ---
const rows: AudioproListRow[] = await getAudioproList(supabase, {
  stage_filter: stage_filter.length > 0 ? stage_filter : undefined,
  has_prospect,
  completeness_range: [completeness_min, completeness_max],
  search: search || undefined,
  limit: 100,
});

// --- Stats en tête (comptes par stage) ---
const statsByStage: Record<LifecycleStage, number> = {
  revendique: 0, approuve: 0, active: 0, engage: 0, premium: 0, churned: 0,
};
// (requête séparée — GROUP BY lifecycle_stage)
const { data: statsRows } = await supabase
  .from('audiopro_lifecycle')
  .select('lifecycle_stage');
for (const r of statsRows ?? []) {
  statsByStage[r.lifecycle_stage as LifecycleStage]++;
}
---
```

### 1.3 Template HTML

**Structure générale** :

```astro
<AdminLayout title="Revendications">
  <div class="space-y-6">
    {/* En-tête avec stats par stage */}
    <header class="flex items-center justify-between">
      <h1 class="font-serif text-3xl text-marine">Revendications</h1>
      <div class="flex gap-2 text-sm">
        {Object.entries(statsByStage).map(([stage, count]) => (
          <span class="px-3 py-1 rounded-full bg-stone-100">
            <strong>{count}</strong> {stage}
          </span>
        ))}
      </div>
    </header>

    {/* Filtres */}
    <AudioproListFilters
      client:load
      initialStageFilter={stage_filter}
      initialHasProspect={has_prospect}
      initialCompletenessMin={completeness_min}
      initialCompletenessMax={completeness_max}
      initialSearch={search}
    />

    {/* Tableau */}
    <div class="overflow-x-auto rounded-lg border border-stone-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-stone-50 text-left text-xs uppercase text-marine/70">
          <tr>
            <th class="px-4 py-3">Date claim</th>
            <th class="px-4 py-3">Audio</th>
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3 text-center">Centres</th>
            <th class="px-4 py-3">Statuts claims</th>
            <th class="px-4 py-3">Lifecycle</th>
            <th class="px-4 py-3 text-center">Complétude</th>
            <th class="px-4 py-3">Dernier email</th>
            <th class="px-4 py-3 text-center">Nb emails 30j</th>
            <th class="px-4 py-3">Prospect CRM</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colspan="11" class="px-4 py-8 text-center text-stone-500">
                Aucun audio ne correspond à ces filtres.
              </td>
            </tr>
          )}
          {rows.map(row => (
            <tr class="border-t border-stone-100 hover:bg-stone-50">
              {/* Date claim */}
              <td class="px-4 py-3 whitespace-nowrap text-xs text-stone-600">
                {row.first_claim_at
                  ? new Date(row.first_claim_at).toLocaleDateString('fr-FR')
                  : '—'}
              </td>

              {/* Audio — clic ouvre la fiche détail */}
              <td class="px-4 py-3">
                <a
                  href={`/admin/claims/${row.audiopro_id}`}
                  class="font-medium text-marine hover:text-orange underline"
                >
                  {[row.prenom, row.nom].filter(Boolean).join(' ') || '(sans nom)'}
                </a>
              </td>

              {/* Email */}
              <td class="px-4 py-3 text-stone-700 text-xs font-mono">
                {row.email}
              </td>

              {/* Nb centres */}
              <td class="px-4 py-3 text-center font-semibold">
                {row.nb_centres}
              </td>

              {/* Statuts claims (résumé) */}
              <td class="px-4 py-3 text-xs text-stone-600">
                {row.claim_status_summary ?? '—'}
              </td>

              {/* Lifecycle stage badge */}
              <td class="px-4 py-3">
                <AudioproStageBadge stage={row.lifecycle_stage} />
              </td>

              {/* Complétude moyenne avec barre */}
              <td class="px-4 py-3 text-center">
                <div class="inline-flex items-center gap-2">
                  <div class="w-16 bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      class="h-full bg-orange rounded-full"
                      style={`width: ${row.completeness_avg}%`}
                    />
                  </div>
                  <span class="text-xs font-semibold">{row.completeness_avg}%</span>
                </div>
              </td>

              {/* Dernier email */}
              <td class="px-4 py-3 text-xs text-stone-600">
                {row.last_email_template ? (
                  <div>
                    <div class="font-medium text-stone-800">{row.last_email_template}</div>
                    <div>{new Date(row.last_email_sent_at!).toLocaleDateString('fr-FR')}</div>
                    {row.last_email_clicked_at && (
                      <div class="text-green-700">Cliqué</div>
                    )}
                  </div>
                ) : '—'}
              </td>

              {/* Nb emails 30j */}
              <td class="px-4 py-3 text-center">{row.emails_sent_30d}</td>

              {/* Prospect CRM */}
              <td class="px-4 py-3">
                {row.prospect_id ? (
                  <a
                    href={`/admin/prospects/${row.prospect_id}`}
                    class="inline-flex px-2 py-1 text-xs rounded bg-orange/10 text-orange font-medium"
                  >
                    {row.prospect_status}
                  </a>
                ) : (
                  <span class="text-xs text-stone-400">—</span>
                )}
              </td>

              {/* Actions — dropdown contextuel */}
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-1">
                  <a
                    href={`/admin/claims/${row.audiopro_id}`}
                    class="p-1.5 rounded hover:bg-stone-200"
                    aria-label="Voir la fiche"
                  >
                    <Icon name="lucide:eye" size={16} />
                  </a>
                  <RelanceEmailDropdown
                    client:load
                    audioproId={row.audiopro_id}
                    audioproEmail={row.email}
                    isUnsubscribed={!!row.email_unsubscribed_at}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
</AdminLayout>
```

### 1.4 Alerte bounces

Au-dessus du tableau, si au moins 1 audio a `hard_bounced_at IS NOT NULL` :

```astro
{hardBouncedCount > 0 && (
  <div class="bg-red-50 border-l-4 border-red-500 p-4 text-sm">
    <strong>{hardBouncedCount} email(s) en bounce permanent</strong> —
    <a href="/admin/claims?stage=revendique&bounced=true" class="underline">
      Voir la liste
    </a>
  </div>
)}
```

---

## 2. Composant `AudioproStageBadge.astro`

**Fichier nouveau** : `src/components/admin/AudioproStageBadge.astro`

Badge de lifecycle stage avec couleur, aligné avec `LIFECYCLE_STAGE_COLORS` et `LIFECYCLE_STAGE_LABELS`.

```astro
---
import type { LifecycleStage } from '../../types/audiopro-lifecycle';
import {
  LIFECYCLE_STAGE_LABELS,
  LIFECYCLE_STAGE_COLORS,
} from '../../types/audiopro-lifecycle';

interface Props {
  stage: LifecycleStage;
  size?: 'sm' | 'md';
}

const { stage, size = 'sm' } = Astro.props;
const label = LIFECYCLE_STAGE_LABELS[stage];
const colorClass = LIFECYCLE_STAGE_COLORS[stage];
const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
---

<span class={`inline-flex font-medium rounded ${colorClass} ${sizeClass}`}>
  {label}
</span>
```

---

## 3. Composant `AudioproListFilters.tsx`

**Fichier nouveau** : `src/components/admin/AudioproListFilters.tsx`

Barre de filtres interactive. Form GET qui push les filtres dans les query params de `/admin/claims`.

```tsx
import { useState } from 'react';
import type { LifecycleStage } from '../../types/audiopro-lifecycle';
import { LIFECYCLE_STAGE_LABELS } from '../../types/audiopro-lifecycle';

interface Props {
  initialStageFilter?: LifecycleStage[];
  initialHasProspect?: boolean | null;
  initialCompletenessMin?: number;
  initialCompletenessMax?: number;
  initialSearch?: string;
}

export default function AudioproListFilters({
  initialStageFilter = [],
  initialHasProspect = null,
  initialCompletenessMin = 0,
  initialCompletenessMax = 100,
  initialSearch = '',
}: Props) {
  const [stages, setStages] = useState<LifecycleStage[]>(initialStageFilter);
  const [hasProspect, setHasProspect] = useState<boolean | null>(initialHasProspect);
  const [compMin, setCompMin] = useState(initialCompletenessMin);
  const [compMax, setCompMax] = useState(initialCompletenessMax);
  const [search, setSearch] = useState(initialSearch);

  const toggleStage = (s: LifecycleStage) => {
    setStages(stages.includes(s) ? stages.filter(x => x !== s) : [...stages, s]);
  };

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    stages.forEach(s => params.append('stage', s));
    if (hasProspect !== null) params.set('has_prospect', String(hasProspect));
    if (compMin !== 0) params.set('comp_min', String(compMin));
    if (compMax !== 100) params.set('comp_max', String(compMax));
    if (search.trim()) params.set('q', search.trim());
    window.location.href = `/admin/claims?${params.toString()}`;
  };

  const reset = () => {
    window.location.href = '/admin/claims';
  };

  const allStages: LifecycleStage[] = [
    'revendique','approuve','active','engage','premium','churned',
  ];

  return (
    <form onSubmit={apply} className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
      {/* Ligne 1 : Recherche + prospect + reset */}
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-marine/70 mb-1">Recherche</label>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, email..."
            className="w-full px-3 py-2 border border-stone-300 rounded"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-marine/70 mb-1">Prospect CRM</label>
          <select
            value={hasProspect === null ? '' : String(hasProspect)}
            onChange={e => {
              const v = e.target.value;
              setHasProspect(v === '' ? null : v === 'true');
            }}
            className="px-3 py-2 border border-stone-300 rounded"
          >
            <option value="">Tous</option>
            <option value="true">Avec prospect</option>
            <option value="false">Sans prospect</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-marine text-white rounded hover:opacity-90"
        >
          Filtrer
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-marine border border-marine rounded hover:bg-stone-100"
        >
          Réinitialiser
        </button>
      </div>

      {/* Ligne 2 : Stages (toggles) */}
      <div>
        <label className="block text-xs font-medium text-marine/70 mb-1">Lifecycle stage</label>
        <div className="flex gap-2 flex-wrap">
          {allStages.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStage(s)}
              className={`px-3 py-1 text-xs rounded border ${
                stages.includes(s)
                  ? 'bg-orange text-white border-orange'
                  : 'bg-white text-marine border-stone-300 hover:border-orange'
              }`}
            >
              {LIFECYCLE_STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Ligne 3 : Complétude (plage) */}
      <div>
        <label className="block text-xs font-medium text-marine/70 mb-1">
          Complétude moyenne : {compMin}% — {compMax}%
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="range"
            min={0}
            max={100}
            value={compMin}
            onChange={e => setCompMin(Math.min(Number(e.target.value), compMax))}
            className="flex-1"
          />
          <input
            type="range"
            min={0}
            max={100}
            value={compMax}
            onChange={e => setCompMax(Math.max(Number(e.target.value), compMin))}
            className="flex-1"
          />
        </div>
      </div>
    </form>
  );
}
```

---

## 4. Composant `RelanceEmailDropdown.tsx`

**Fichier nouveau** : `src/components/admin/RelanceEmailDropdown.tsx`

Dropdown avec 6 templates de relance. Chaque choix ouvre la modale de confirmation avant envoi.

**Important** : en Phase 1, **seul `fiche_incomplete_relance` est fonctionnel**. Les autres options sont affichées en grisé avec un tooltip "Disponible en Phase 2".

```tsx
import { useState, useRef, useEffect } from 'react';
import RelanceConfirmModal from './RelanceConfirmModal';
import type { EmailTemplateKey } from '../../types/audiopro-lifecycle';

interface Props {
  audioproId: string;
  audioproEmail: string;
  isUnsubscribed: boolean;
}

interface TemplateOption {
  key: EmailTemplateKey;
  label: string;
  availableInPhase1: boolean;
}

const OPTIONS: TemplateOption[] = [
  { key: 'fiche_incomplete_relance',     label: 'Complétude de fiche',      availableInPhase1: true  },
  { key: 'nurture_01_premiers_patients', label: 'Premiers patients',        availableInPhase1: false },
  { key: 'nurture_02_offre_fondateurs',  label: 'Offre Fondateurs',         availableInPhase1: false },
  { key: 'nurture_03_cas_concret',       label: 'Étude de cas',             availableInPhase1: false },
  { key: 'nurture_04_slots_restants',    label: 'Slots Fondateurs restants',availableInPhase1: false },
  { key: 'nurture_05_ads_ou_sortie',     label: 'Ads ou sortie',            availableInPhase1: false },
];

export default function RelanceEmailDropdown({
  audioproId, audioproEmail, isUnsubscribed,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateKey | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  if (isUnsubscribed) {
    return (
      <button
        disabled
        title="Cet audio est désabonné — relance impossible"
        className="px-2 py-1 text-xs text-stone-400 border border-stone-200 rounded cursor-not-allowed"
      >
        Relancer
      </button>
    );
  }

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1 text-xs text-marine border border-stone-300 rounded hover:bg-stone-100"
        >
          Relancer ▾
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-stone-200 rounded shadow-lg z-10">
            <div className="py-1">
              {OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  disabled={!opt.availableInPhase1}
                  onClick={() => {
                    if (!opt.availableInPhase1) return;
                    setSelectedTemplate(opt.key);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs ${
                    opt.availableInPhase1
                      ? 'hover:bg-stone-100 text-marine cursor-pointer'
                      : 'text-stone-400 cursor-not-allowed'
                  }`}
                  title={opt.availableInPhase1 ? undefined : 'Disponible en Phase 2'}
                >
                  {opt.label}
                  {!opt.availableInPhase1 && ' (v2)'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <RelanceConfirmModal
          audioproId={audioproId}
          audioproEmail={audioproEmail}
          templateKey={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </>
  );
}
```

---

## 5. Composant `RelanceConfirmModal.tsx`

**Fichier nouveau** : `src/components/admin/RelanceConfirmModal.tsx`

Modale de confirmation avant POST vers `/api/admin/relance-email`.

```tsx
import { useState } from 'react';
import type { EmailTemplateKey } from '../../types/audiopro-lifecycle';
import { EMAIL_TEMPLATE_LABELS } from '../../types/audiopro-lifecycle';

interface Props {
  audioproId: string;
  audioproEmail: string;
  templateKey: EmailTemplateKey;
  onClose: () => void;
}

export default function RelanceConfirmModal({
  audioproId, audioproEmail, templateKey, onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const send = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/relance-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audiopro_id: audioproId,
          template_key: templateKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue');
      } else {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl text-marine mb-4">
          Confirmer l'envoi
        </h2>

        {!success && !error && (
          <>
            <p className="text-sm text-marine/80 mb-4">
              Vous allez envoyer le template <strong>{EMAIL_TEMPLATE_LABELS[templateKey]}</strong> à :
            </p>
            <div className="bg-stone-100 px-3 py-2 rounded font-mono text-sm mb-4">
              {audioproEmail}
            </div>
            <p className="text-xs text-stone-600 mb-4">
              Cette action bypasse les règles de collision CRM. Un log sera créé dans l'historique email et dans la timeline du prospect (si lié).
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-marine border border-stone-300 rounded hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                onClick={send}
                disabled={loading}
                className="px-4 py-2 bg-orange text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </>
        )}

        {success && (
          <div className="text-emerald-700 text-sm">
            Email envoyé. Actualisation...
          </div>
        )}

        {error && (
          <div className="space-y-3">
            <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-800">
              {error}
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-marine border border-stone-300 rounded">
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6. Page fiche détail `/admin/claims/[audiopro_id]`

**Fichier nouveau** : `src/pages/admin/claims/[audiopro_id].astro`

### 6.1 Data fetching SSR

```astro
---
export const prerender = false;

import AdminLayout from '../../../layouts/AdminLayout.astro';
import { createServerClient } from '../../../lib/supabase';
import AudioproStageBadge from '../../../components/admin/AudioproStageBadge.astro';
import EmailEventsTimeline from '../../../components/admin/EmailEventsTimeline.astro';
import LifecycleEventsTimeline from '../../../components/admin/LifecycleEventsTimeline.astro';
import RelanceEmailDropdown from '../../../components/admin/RelanceEmailDropdown.tsx';
import PromoteProspectButton from '../../../components/admin/PromoteProspectButton.tsx';
import { Icon } from 'astro-icon/components';
import {
  COMPLETENESS_FIELD_LABELS,
  type AudioproLifecycle,
  type AudioproLifecycleEvent,
  type EmailEvent,
  type AudioproMissingField,
} from '../../../types/audiopro-lifecycle';

// Auth admin (aligner sur le pattern existant)

const { audiopro_id } = Astro.params;
if (!audiopro_id) return Astro.redirect('/admin/claims');

const supabase = createServerClient();

// 1. Audio
const { data: audiopro } = await supabase
  .from('audiopro_lifecycle')
  .select('*')
  .eq('id', audiopro_id)
  .maybeSingle<AudioproLifecycle>();

if (!audiopro) return Astro.redirect('/admin/claims?error=notfound');

// 2. Centres liés (avec données complètes)
const { data: linkedCentres } = await supabase
  .from('audiopro_centres')
  .select(`
    centre_id,
    linked_via,
    linked_at,
    centres_auditifs (
      id, slug, nom, ville, cp, plan, claim_status,
      tel, site_web, a_propos, photo_url, email, specialites, marques,
      claimed_at, premium_since
    )
  `)
  .eq('audiopro_id', audiopro_id);

// 3. Missing fields (RPC)
const { data: missingFields } = await supabase
  .rpc('audiopro_missing_fields', { p_audiopro_id: audiopro_id });
const missing: AudioproMissingField[] = (missingFields ?? []) as AudioproMissingField[];

// 4. Lifecycle events
const { data: lifecycleEvents } = await supabase
  .from('audiopro_lifecycle_events')
  .select('*')
  .eq('audiopro_id', audiopro_id)
  .order('occurred_at', { ascending: false });

// 5. Email events
const { data: emailEvents } = await supabase
  .from('email_events')
  .select('*')
  .eq('audiopro_id', audiopro_id)
  .order('sent_at', { ascending: false });

// 6. Attribution (depuis claim_attributions pour les centres liés)
const centreIds = (linkedCentres ?? []).map((lc: any) => lc.centre_id);
const { data: attributions } = centreIds.length > 0
  ? await supabase
      .from('claim_attributions')
      .select('*')
      .in('centre_id', centreIds)
      .order('created_at', { ascending: false })
  : { data: [] };

// 7. Prospect (si lié)
const { data: prospect } = audiopro.prospect_id
  ? await supabase
      .from('prospects')
      .select('*')
      .eq('id', audiopro.prospect_id)
      .maybeSingle()
  : { data: null };

// 8. Interactions du prospect (si lié)
const { data: interactions } = audiopro.prospect_id
  ? await supabase
      .from('interactions')
      .select('*')
      .eq('prospect_id', audiopro.prospect_id)
      .order('occurred_at', { ascending: false })
      .limit(20)
  : { data: [] };
---
```

### 6.2 Template

```astro
<AdminLayout title={`${audiopro.prenom ?? ''} ${audiopro.nom ?? ''}`.trim() || audiopro.email}>
  <div class="space-y-6 max-w-6xl">

    {/* Retour */}
    <a href="/admin/claims" class="inline-flex items-center gap-1 text-sm text-marine/70 hover:text-orange">
      <Icon name="lucide:arrow-left" size={14} />
      Retour aux revendications
    </a>

    {/* En-tête */}
    <header class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="font-serif text-3xl text-marine">
          {[audiopro.prenom, audiopro.nom].filter(Boolean).join(' ') || '(sans nom)'}
        </h1>
        <div class="mt-1 text-stone-600 font-mono text-sm">{audiopro.email}</div>
        <div class="mt-2 flex items-center gap-2">
          <AudioproStageBadge stage={audiopro.lifecycle_stage} size="md" />
          <span class="text-xs text-stone-500">
            depuis {new Date(audiopro.stage_changed_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <RelanceEmailDropdown
          client:load
          audioproId={audiopro.id}
          audioproEmail={audiopro.email}
          isUnsubscribed={!!audiopro.email_unsubscribed_at}
        />
        {!audiopro.prospect_id && (
          <PromoteProspectButton
            client:load
            audioproId={audiopro.id}
            audioproName={[audiopro.prenom, audiopro.nom].filter(Boolean).join(' ') || audiopro.email}
          />
        )}
      </div>
    </header>

    {/* Alertes */}
    {audiopro.email_unsubscribed_at && (
      <div class="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm">
        Cet audio s'est <strong>désabonné</strong> le {new Date(audiopro.email_unsubscribed_at).toLocaleDateString('fr-FR')}. Aucun mail nurture ne lui sera envoyé.
      </div>
    )}
    {audiopro.hard_bounced_at && (
      <div class="bg-red-50 border-l-4 border-red-500 p-3 text-sm">
        <strong>Adresse en bounce permanent.</strong> Les relances sont bloquées.
      </div>
    )}

    {/* Grid 2 colonnes */}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Colonne gauche (2/3) */}
      <div class="lg:col-span-2 space-y-6">

        {/* Bloc Identité */}
        <section class="bg-white border border-stone-200 rounded-lg p-5">
          <h2 class="font-serif text-lg text-marine mb-3">Identité</h2>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs text-stone-500">ADELI</dt>
              <dd>{audiopro.adeli ?? '—'}</dd>
            </div>
            <div>
              <dt class="text-xs text-stone-500">RPPS</dt>
              <dd>{audiopro.rpps ?? '—'}</dd>
            </div>
            <div>
              <dt class="text-xs text-stone-500">1re revendication</dt>
              <dd>
                {audiopro.first_claim_at
                  ? new Date(audiopro.first_claim_at).toLocaleDateString('fr-FR')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-stone-500">Dernière connexion</dt>
              <dd>
                {audiopro.last_login_at
                  ? new Date(audiopro.last_login_at).toLocaleDateString('fr-FR')
                  : '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Bloc Centres */}
        <section class="bg-white border border-stone-200 rounded-lg p-5">
          <h2 class="font-serif text-lg text-marine mb-3">
            Centres liés ({linkedCentres?.length ?? 0})
          </h2>
          <div class="space-y-3">
            {(linkedCentres ?? []).map((lc: any) => {
              const c = lc.centres_auditifs;
              const mf = missing.find(m => m.centre_id === c.id);
              return (
                <div class="border border-stone-200 rounded p-3">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <a
                        href={`/centre/${c.slug}/`}
                        target="_blank"
                        class="font-medium text-marine hover:text-orange"
                      >
                        {c.nom}
                      </a>
                      <div class="text-xs text-stone-500">
                        {c.ville} {c.cp} — {c.plan} / {c.claim_status}
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="text-lg font-bold">{mf?.completeness_pct ?? 0}%</div>
                      <div class="text-xs text-stone-500">complétude</div>
                    </div>
                  </div>
                  {mf && mf.missing_fields.length > 0 && (
                    <div class="mt-2 text-xs text-stone-600">
                      Manque : {mf.missing_fields.map(f => COMPLETENESS_FIELD_LABELS[f]).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bloc Emails */}
        <section class="bg-white border border-stone-200 rounded-lg p-5">
          <h2 class="font-serif text-lg text-marine mb-3">
            Historique emails ({emailEvents?.length ?? 0})
          </h2>
          <EmailEventsTimeline events={(emailEvents ?? []) as EmailEvent[]} />
        </section>

        {/* Bloc Lifecycle events */}
        <section class="bg-white border border-stone-200 rounded-lg p-5">
          <h2 class="font-serif text-lg text-marine mb-3">
            Historique lifecycle ({lifecycleEvents?.length ?? 0})
          </h2>
          <LifecycleEventsTimeline events={(lifecycleEvents ?? []) as AudioproLifecycleEvent[]} />
        </section>

      </div>

      {/* Colonne droite (1/3) */}
      <div class="space-y-6">

        {/* Prospect CRM (si lié) */}
        {prospect && (
          <section class="bg-white border border-stone-200 rounded-lg p-5">
            <h2 class="font-serif text-lg text-marine mb-3">Prospect CRM</h2>
            <dl class="space-y-2 text-sm">
              <div>
                <dt class="text-xs text-stone-500">Statut</dt>
                <dd class="font-medium">{prospect.status}</dd>
              </div>
              {prospect.next_action && (
                <div>
                  <dt class="text-xs text-stone-500">Next action</dt>
                  <dd>{prospect.next_action}</dd>
                </div>
              )}
              {prospect.mrr_potentiel && (
                <div>
                  <dt class="text-xs text-stone-500">MRR potentiel</dt>
                  <dd>{prospect.mrr_potentiel}€</dd>
                </div>
              )}
            </dl>
            <a
              href={`/admin/prospects/${prospect.id}`}
              class="mt-3 inline-flex items-center gap-1 text-sm text-orange hover:underline"
            >
              Voir la fiche prospect
              <Icon name="lucide:arrow-right" size={12} />
            </a>
          </section>
        )}

        {/* Attribution */}
        <section class="bg-white border border-stone-200 rounded-lg p-5">
          <h2 class="font-serif text-lg text-marine mb-3">Attribution</h2>
          {attributions && attributions.length > 0 ? (
            <div class="space-y-2 text-xs">
              {attributions.slice(0, 3).map((a: any) => (
                <div class="border-b border-stone-100 pb-2">
                  <div class="text-stone-500">{new Date(a.created_at).toLocaleDateString('fr-FR')}</div>
                  {a.utm_source && <div>Source : {a.utm_source} / {a.utm_medium} / {a.utm_campaign}</div>}
                  {a.gclid && <div>GClid : oui</div>}
                  {a.referrer && <div class="truncate">Referrer : {a.referrer}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p class="text-sm text-stone-500">Aucune attribution tracée.</p>
          )}
        </section>

      </div>

    </div>
  </div>
</AdminLayout>
```

---

## 7. Composant `EmailEventsTimeline.astro`

**Fichier nouveau** : `src/components/admin/EmailEventsTimeline.astro`

```astro
---
import type { EmailEvent } from '../../types/audiopro-lifecycle';
import { EMAIL_TEMPLATE_LABELS } from '../../types/audiopro-lifecycle';
import { Icon } from 'astro-icon/components';

interface Props {
  events: EmailEvent[];
}
const { events } = Astro.props;
---

{events.length === 0 ? (
  <p class="text-sm text-stone-500">Aucun email envoyé pour cet audio.</p>
) : (
  <ol class="space-y-3">
    {events.map(ev => {
      const status = ev.bounced_at ? 'bounced'
                   : ev.complaint_at ? 'complaint'
                   : ev.clicked_at ? 'clicked'
                   : ev.opened_at ? 'opened'
                   : ev.delivered_at ? 'delivered'
                   : 'sent';
      const statusColor = {
        sent:      'bg-stone-200 text-stone-700',
        delivered: 'bg-blue-100 text-blue-800',
        opened:    'bg-emerald-100 text-emerald-800',
        clicked:   'bg-orange text-white',
        bounced:   'bg-red-100 text-red-800',
        complaint: 'bg-red-200 text-red-900',
      }[status];

      return (
        <li class="border-l-2 border-stone-200 pl-4 py-1">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-medium text-sm text-marine">
                {EMAIL_TEMPLATE_LABELS[ev.template_key]}
              </div>
              <div class="text-xs text-stone-500">
                {new Date(ev.sent_at).toLocaleString('fr-FR')}
                {' · '}
                {ev.trigger}
              </div>
            </div>
            <span class={`text-xs px-2 py-0.5 rounded ${statusColor}`}>
              {status}
            </span>
          </div>
          {ev.clicked_at && ev.metadata && (ev.metadata as any).clicked_url && (
            <div class="text-xs text-stone-600 mt-1">
              Cliqué : {(ev.metadata as any).clicked_url}
            </div>
          )}
        </li>
      );
    })}
  </ol>
)}
```

---

## 8. Composant `LifecycleEventsTimeline.astro`

**Fichier nouveau** : `src/components/admin/LifecycleEventsTimeline.astro`

```astro
---
import type { AudioproLifecycleEvent } from '../../types/audiopro-lifecycle';
import { LIFECYCLE_STAGE_LABELS } from '../../types/audiopro-lifecycle';

interface Props {
  events: AudioproLifecycleEvent[];
}
const { events } = Astro.props;

const reasonLabels: Record<string, string> = {
  claim_submitted:                  'Revendication soumise',
  claim_approved:                   'Claim approuvé par admin',
  claim_rejected:                   'Claim rejeté par admin',
  first_login_detected:             '1re connexion espace pro',
  completeness_threshold_reached:   'Fiche passe à ≥ 60% complète',
  email_clicked:                    'Clic sur mail nurture',
  stripe_paid:                      'Paiement Stripe réussi',
  stripe_paid_batch:                'Passage premium (batch)',
  stripe_cancelled:                 'Annulation Stripe',
  manual_override:                  'Override manuel admin',
  migration_initiale:               'Migration données existantes',
  migration_premium_detected:       'Migration : centre déjà premium',
  promoted_to_prospect:             'Promu en prospect CRM',
};
---

{events.length === 0 ? (
  <p class="text-sm text-stone-500">Aucun événement lifecycle.</p>
) : (
  <ol class="space-y-2">
    {events.map(ev => (
      <li class="border-l-2 border-stone-200 pl-4 py-1">
        <div class="text-xs text-stone-500">
          {new Date(ev.occurred_at).toLocaleString('fr-FR')}
        </div>
        <div class="text-sm">
          <span class="font-medium">
            {ev.from_stage ? LIFECYCLE_STAGE_LABELS[ev.from_stage] : '(aucun)'}
          </span>
          {' → '}
          <span class="font-medium text-marine">
            {LIFECYCLE_STAGE_LABELS[ev.to_stage]}
          </span>
        </div>
        {ev.reason && (
          <div class="text-xs text-stone-600">
            {reasonLabels[ev.reason] ?? ev.reason}
          </div>
        )}
      </li>
    ))}
  </ol>
)}
```

---

## 9. Composant `PromoteProspectButton.tsx`

**Fichier nouveau** : `src/components/admin/PromoteProspectButton.tsx`

Bouton avec modale de confirmation pour créer le prospect CRM.

```tsx
import { useState } from 'react';

interface Props {
  audioproId: string;
  audioproName: string;
}

export default function PromoteProspectButton({ audioproId, audioproName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'prospect' | 'contacte'>('contacte');

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/promote-to-prospect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audiopro_id: audioproId,
          initial_status: status,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erreur inconnue');
      } else {
        window.location.href = `/admin/prospects/${data.prospect_id}`;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm bg-marine text-white rounded hover:opacity-90"
      >
        Promouvoir en prospect
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="font-serif text-xl text-marine mb-4">
              Promouvoir en prospect
            </h2>

            <p className="text-sm text-marine/80 mb-4">
              Créer une fiche prospect CRM pour <strong>{audioproName}</strong>.
              Cette action :
            </p>
            <ul className="text-sm text-marine/80 list-disc pl-5 mb-4 space-y-1">
              <li>Crée une ligne dans le kanban commercial</li>
              <li>Lie tous les centres de l'audio au prospect</li>
              <li>Active la règle de collision (les mails auto seront skipés)</li>
            </ul>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-marine/70 mb-1">
                  Statut initial
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-stone-300 rounded"
                >
                  <option value="contacte">Contacté</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-marine/70 mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
                  placeholder="Contexte du contact, ce qu'on attend de lui..."
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-800 mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-4 py-2 text-marine border border-stone-300 rounded hover:bg-stone-100"
              >
                Annuler
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="px-4 py-2 bg-marine text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer le prospect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 10. Tests manuels UI

### Checklist à valider après déploiement :

**Liste `/admin/claims`** :
- [ ] Affiche 43 revendicateurs (ou le count réel après migration)
- [ ] Anthony apparaît UNE seule fois avec "3 centres" (si c'est bien lui)
- [ ] Badges lifecycle cohérents avec les données (revendique, approuve, etc.)
- [ ] Complétude moyenne affichée avec barre visuelle
- [ ] Dernier email visible si envoyé
- [ ] Filtre par stage fonctionne (toggles)
- [ ] Filtre "Avec/Sans prospect" fonctionne
- [ ] Recherche par nom/email fonctionne
- [ ] Reset des filtres redirige vers `/admin/claims` nu
- [ ] Alerte bounces affichée si > 0

**Dropdown Relancer** :
- [ ] Ouvre au clic
- [ ] "Complétude de fiche" cliquable
- [ ] Les 5 autres templates grisés avec mention "(v2)"
- [ ] Ferme au clic extérieur
- [ ] Désactivé si audio désabonné (avec tooltip)

**Modale de confirmation** :
- [ ] S'ouvre après sélection template
- [ ] Affiche email destinataire
- [ ] Bouton Annuler ferme sans rien faire
- [ ] Bouton Envoyer POST `/api/admin/relance-email`
- [ ] Message succès + reload après envoi
- [ ] Message erreur affiché si échec (ex: désabonné)

**Fiche détail `/admin/claims/[audiopro_id]`** :
- [ ] URL directe `/admin/claims/{uuid}` charge la bonne fiche
- [ ] URL invalide redirige vers liste avec erreur
- [ ] Identité, centres, timelines, prospect (si lié), attribution affichés
- [ ] Bouton "Promouvoir en prospect" visible si pas de prospect lié
- [ ] Bouton caché si prospect déjà lié (affiche la carte prospect à la place)
- [ ] Timeline emails montre les mails envoyés avec statut coloré
- [ ] Timeline lifecycle montre les transitions avec labels lisibles
- [ ] Liens centres ouvrent la fiche publique en nouvel onglet
- [ ] Lien prospect redirige vers `/admin/prospects/{id}`

**Bouton Promouvoir** :
- [ ] Modale avec champ statut initial (contacte par défaut) et notes
- [ ] POST `/api/admin/promote-to-prospect` au submit
- [ ] Redirect vers `/admin/prospects/{id}` au succès
- [ ] Message erreur si l'audio a déjà un prospect (409)

### Tests responsive

- [ ] Liste lisible sur desktop large (1440px+)
- [ ] Liste scrollable horizontalement sur tablette (768-1024px)
- [ ] Fiche détail passe en colonne unique sur mobile (< 768px)
- [ ] Dropdowns et modales accessibles sur mobile

### Tests accessibilité

- [ ] Tous les boutons ont un label visible ou aria-label
- [ ] Focus visible (outline orange) sur tous les éléments interactifs
- [ ] Touch targets ≥ 44x44px sur mobile (boutons de la liste)
- [ ] Modales : Esc pour fermer, focus trap, ARIA roles

---

## 11. Checklist d'exécution Claude Code

**Ordre recommandé** :

1. [ ] **Pré-requis** : `specs-phase1-data.md` et `specs-phase1-endpoints.md` exécutés
2. [ ] Créer dossier `src/components/admin/` si absent
3. [ ] Créer `AudioproStageBadge.astro` (§2)
4. [ ] Créer `AudioproListFilters.tsx` (§3)
5. [ ] Créer `RelanceEmailDropdown.tsx` (§4)
6. [ ] Créer `RelanceConfirmModal.tsx` (§5)
7. [ ] Créer `EmailEventsTimeline.astro` (§7)
8. [ ] Créer `LifecycleEventsTimeline.astro` (§8)
9. [ ] Créer `PromoteProspectButton.tsx` (§9)
10. [ ] Refonte `src/pages/admin/claims.astro` (§1) — **sauvegarde git avant**
11. [ ] Créer `src/pages/admin/claims/[audiopro_id].astro` (§6)
12. [ ] Lancer tests manuels UI (§10)
13. [ ] Commit unique : `feat(admin): refonte claims page audiopro-centric + fiche détail`

**Risque principal** : la refonte de `src/pages/admin/claims.astro` est destructrice. Le fichier actuel (18 Ko) contient la logique ancienne centre-par-centre. Vérifier qu'aucune autre page ne l'importe avant refonte. Faire un commit distinct avec la version historique si nécessaire (option : renommer l'ancien en `claims-legacy.astro` gardé en référence, supprimable en Phase 3).

---

## 12. Hors scope Phase 1 — prévu Phase 2 / 3

- Tuile "Drip email" sur `/admin/index` (§11 du PRD) — **Phase 3**
- Page `/admin/emails` avec graphiques — **Phase 3**
- 5 autres templates grisés dans le dropdown — **Phase 2**
- Forçage manuel de lifecycle stage (override) — **Phase 2**
- Fusion de doublons audiopro — **Phase 2** (rare, peut attendre)
- Bouton "Voir espace pro (impersonate)" — **hors scope**

---

**Fin des specs Phase 1 — Admin UI.**
