import { useState } from 'react';
import type { LifecycleStage } from '../../types/audiopro-lifecycle';
import { LIFECYCLE_STAGES, LIFECYCLE_STAGE_LABELS } from '../../types/audiopro-lifecycle';

interface Props {
  initialStageFilter?: LifecycleStage[];
  initialHasProspect?: boolean | null;
  initialCompletenessMin?: number;
  initialCompletenessMax?: number;
  initialSearch?: string;
}

/**
 * Filtres interactifs pour /admin/claims. Push les filtres dans les
 * query params — la page SSR relit les params et refait le fetch.
 */
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
    setStages(stages.includes(s) ? stages.filter((x) => x !== s) : [...stages, s]);
  };

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    stages.forEach((s) => params.append('stage', s));
    if (hasProspect !== null) params.set('has_prospect', String(hasProspect));
    if (compMin !== 0) params.set('comp_min', String(compMin));
    if (compMax !== 100) params.set('comp_max', String(compMax));
    if (search.trim()) params.set('q', search.trim());
    const qs = params.toString();
    window.location.href = qs ? `/admin/claims?${qs}` : '/admin/claims';
  };

  const reset = () => {
    window.location.href = '/admin/claims';
  };

  return (
    <form
      onSubmit={apply}
      className="bg-white border border-[#E4DED3] rounded-lg p-4 space-y-3 font-sans"
    >
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-[#6B7A90] mb-1" htmlFor="audio-search">
            Recherche
          </label>
          <input
            id="audio-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, prénom, email..."
            className="w-full px-3 py-2 border border-[#E4DED3] rounded text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
            style={{ minHeight: 44 }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#6B7A90] mb-1" htmlFor="audio-prospect">
            Prospect CRM
          </label>
          <select
            id="audio-prospect"
            value={hasProspect === null ? '' : String(hasProspect)}
            onChange={(e) => {
              const v = e.target.value;
              setHasProspect(v === '' ? null : v === 'true');
            }}
            className="px-3 py-2 border border-[#E4DED3] rounded text-[#1B2E4A] focus:outline-2 focus:outline-[#D97B3D]"
            style={{ minHeight: 44 }}
          >
            <option value="">Tous</option>
            <option value="true">Avec prospect</option>
            <option value="false">Sans prospect</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-[#1B2E4A] text-white rounded hover:opacity-90 focus:outline-2 focus:outline-[#D97B3D]"
          style={{ minHeight: 44 }}
        >
          Filtrer
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-[#1B2E4A] border border-[#E4DED3] rounded hover:bg-[#F8F5F0] focus:outline-2 focus:outline-[#D97B3D]"
          style={{ minHeight: 44 }}
        >
          Réinitialiser
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7A90] mb-1">Lifecycle stage</label>
        <div className="flex gap-2 flex-wrap">
          {LIFECYCLE_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleStage(s)}
              aria-pressed={stages.includes(s)}
              className={
                stages.includes(s)
                  ? 'px-3 py-1 text-xs rounded border bg-[#D97B3D] text-white border-[#D97B3D]'
                  : 'px-3 py-1 text-xs rounded border bg-white text-[#1B2E4A] border-[#E4DED3] hover:border-[#D97B3D]'
              }
            >
              {LIFECYCLE_STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B7A90] mb-1">
          Complétude moyenne : {compMin}% — {compMax}%
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={compMin}
            onChange={(e) => setCompMin(Math.min(Number(e.target.value), compMax))}
            className="flex-1"
            aria-label="Complétude minimum"
          />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={compMax}
            onChange={(e) => setCompMax(Math.max(Number(e.target.value), compMin))}
            className="flex-1"
            aria-label="Complétude maximum"
          />
        </div>
      </div>
    </form>
  );
}
