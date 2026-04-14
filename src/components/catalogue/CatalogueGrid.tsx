/**
 * Grille catalogue — mobile-first UX
 * Barre sticky Filtrer/Trier + bottom sheet filtres + chips actifs + cards enrichies
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

interface Product {
  slug: string;
  marque: string;
  marqueLabel: string;
  groupe: string;
  modele: string;
  formeType: string;
  puce?: string;
  niveau?: string;
  niveauPosition: number;
  classe?: string;
  rac0?: boolean;
  annee: number;
  prix?: { eur?: { unitaire?: number; min?: number; max?: number } };
  specs?: { canaux?: number; ip?: string };
  connectivite?: { bluetooth?: string; auracast?: boolean };
  fonctionnalites?: { rechargeable?: boolean; acouphenes?: boolean };
  image?: string;
  legacy?: boolean;
  enAvant?: boolean;
  noteExpert?: number;
}

interface Props { products: Product[] }

const PAGE_SIZE = 18;

// ─── Filter/Sort options ─────────────────────────
const BRANDS = [
  'phonak', 'signia', 'oticon', 'resound', 'starkey', 'widex',
  'unitron', 'bernafon', 'philips', 'rexton', 'audio-service', 'hansaton',
];
const BRAND_LABEL: Record<string, string> = {
  phonak: 'Phonak', signia: 'Signia', oticon: 'Oticon', resound: 'ReSound',
  starkey: 'Starkey', widex: 'Widex', unitron: 'Unitron', bernafon: 'Bernafon',
  philips: 'Philips', rexton: 'Rexton', 'audio-service': 'Audio Service', hansaton: 'Hansaton',
};
const TYPES = ['RIC', 'BTE', 'ITE', 'CIC', 'IIC', 'Slim RIC'];
const TYPE_LABEL: Record<string, string> = {
  RIC: 'RIC — Micro-contour', BTE: 'BTE — Contour', ITE: 'ITE — Intra',
  CIC: 'CIC — Mini intra', IIC: 'IIC — Invisible', 'Slim RIC': 'Slim RIC',
};
const USAGES = [
  { value: 'premier', label: 'Premier appareillage' },
  { value: 'acouphenes', label: 'Acouphènes' },
  { value: 'discret', label: 'Discrétion maximale' },
  { value: 'actif', label: 'Professionnel actif' },
];
const BUDGETS = [
  { value: 'classe1', label: 'Classe 1 — RAC 0€' },
  { value: '0-1000', label: 'Moins de 1 000€' },
  { value: '1000-1500', label: '1 000€ – 1 500€' },
  { value: '1500-2000', label: '1 500€ – 2 000€' },
  { value: '2000+', label: 'Plus de 2 000€' },
];
const NOTES = [
  { value: '9', label: '9+ Excellence' },
  { value: '8', label: '8+ Très bien' },
  { value: '7', label: '7+ Bien' },
];
const YEARS = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023-', label: '2023 et avant' },
];
const SORTS = [
  { value: 'flagship', label: "Flagships d'abord" },
  { value: 'note-desc', label: 'Meilleures notes' },
  { value: 'year-desc', label: 'Plus récents' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'name-asc', label: 'A → Z' },
];

// ─── Helpers ──────────────────────────────────────
function getPrice(p: Product): number | undefined { return p.prix?.eur?.unitaire ?? p.prix?.eur?.min; }
function fmtPrice(n: number): string { return n.toLocaleString('fr-FR') + ' €'; }
const NIVEAU_LABELS: Record<number, string> = { 1: 'Essentiel', 2: 'Confort', 3: 'Avancé', 4: 'Premium', 5: 'Excellence' };
const TYPE_SHORT: Record<string, string> = { RIC: 'RIC', BTE: 'Contour', ITE: 'Intra', ITC: 'Intra-canal', CIC: 'Mini intra', IIC: 'Invisible', 'Slim RIC': 'Slim RIC', Earbud: 'Écouteur', CROS: 'CROS' };
const PUCE_SLUG: Record<string, string> = {
  Sirius: 'oticon-sirius', 'Polaris R': 'oticon-polaris-r', Polaris: 'oticon-polaris', 'Velox S': 'oticon-velox-s',
  DEEPSONIC: 'phonak-deepsonic', ERA: 'phonak-era', PRISM: 'phonak-prism',
  'IX Platform': 'signia-ix', 'AX Platform': 'signia-ax',
  'GN 2.0': 'resound-gn2', 'Dual-chip 360 + DNN': 'resound-360-dnn', '360 Chip': 'resound-360', '360 Chip + ML AI': 'resound-360-ml',
  'G3 Neuro': 'starkey-g3-neuro', 'G2 Neuro': 'starkey-g2-neuro', 'Neuro Processor': 'starkey-neuro-processor',
  W1: 'widex-w1', 'Integra OS': 'unitron-integra-os', DECS: 'bernafon-decs',
};

function matchUsage(p: Product, u: string): boolean {
  switch (u) {
    case 'premier': return p.classe === '1' || p.rac0 === true || (getPrice(p) ?? Infinity) < 1000;
    case 'acouphenes': return p.fonctionnalites?.acouphenes === true;
    case 'discret': return ['IIC', 'CIC', 'Slim RIC'].includes(p.formeType);
    case 'actif': return (p.noteExpert ?? 0) >= 8 && !!p.connectivite?.bluetooth;
    default: return true;
  }
}

function getIdealTags(p: Product): string[] {
  const t: string[] = [];
  if ((p.classe === '1' || p.rac0) || (getPrice(p) && getPrice(p)! < 1000)) t.push('Premier appareil');
  if (p.fonctionnalites?.acouphenes) t.push('Acouphènes');
  if (p.formeType === 'IIC' || p.formeType === 'CIC') t.push('Ultra-discret');
  if ((p.specs?.canaux ?? 0) >= 20 && p.connectivite?.bluetooth) t.push('Env. bruyant');
  return t;
}

function getSubScores(p: Product) {
  const b = p.noteExpert ?? 5;
  const c = p.specs?.canaux ?? 8;
  return {
    son: Math.min(10, b + (c >= 20 ? 0.5 : c >= 12 ? 0 : -0.5)),
    confort: Math.min(10, b + (p.fonctionnalites?.rechargeable ? 0.3 : -0.2)),
    connect: Math.min(10, b + (p.connectivite?.auracast ? 0.5 : p.connectivite?.bluetooth ? 0 : -1)),
    batterie: Math.min(10, b + (p.fonctionnalites?.rechargeable ? 0.5 : -0.5)),
  };
}

// ─── State type ────────────────────────────────────
interface Filters {
  brand: string; type: string; budget: string; note: string;
  year: string; usage: string; rechargeable: boolean;
  bluetooth: boolean; auracast: boolean; showLegacy: boolean;
}
const EMPTY: Filters = { brand: '', type: '', budget: '', note: '', year: '', usage: '', rechargeable: false, bluetooth: false, auracast: false, showLegacy: false };

// ═══════════════════════════════════════════════════
export default function CatalogueGrid({ products }: Props) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [sort, setSort] = useState('flagship');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  const set = useCallback((patch: Partial<Filters>) => {
    setF(prev => ({ ...prev, ...patch }));
    setVisibleCount(PAGE_SIZE);
  }, []);

  // Lock body scroll when panels open
  useEffect(() => {
    document.body.style.overflow = (showFilters || showSort) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showFilters, showSort]);

  const filtered = useMemo(() => {
    let r = products;
    if (!f.showLegacy) r = r.filter(p => !p.legacy);
    if (f.brand) r = r.filter(p => p.marque === f.brand);
    if (f.type) r = r.filter(p => p.formeType === f.type);
    if (f.usage) r = r.filter(p => matchUsage(p, f.usage));
    if (f.rechargeable) r = r.filter(p => p.fonctionnalites?.rechargeable);
    if (f.bluetooth) r = r.filter(p => p.connectivite?.bluetooth);
    if (f.auracast) r = r.filter(p => p.connectivite?.auracast);
    if (f.note) r = r.filter(p => (p.noteExpert ?? 0) >= parseInt(f.note));
    if (f.year) {
      if (f.year.endsWith('-')) r = r.filter(p => p.annee <= parseInt(f.year));
      else r = r.filter(p => p.annee === parseInt(f.year));
    }
    if (f.budget === 'classe1') r = r.filter(p => p.classe === '1' || p.rac0);
    else if (f.budget) {
      const [mn, mx] = f.budget.split('-').map(s => parseInt(s.replace('+', '')) || 0);
      r = r.filter(p => { const pr = getPrice(p); if (!pr) return false; if (f.budget.endsWith('+')) return pr >= mn; return pr >= mn && pr <= (mx || Infinity); });
    }

    if (sort === 'flagship') {
      const best: Record<string, number> = {};
      for (const p of r) { const s = p.noteExpert ?? 0; if (!best[p.marque] || s > best[p.marque]) best[p.marque] = s; }
      const flags = new Set(r.filter(p => p.enAvant || (p.noteExpert ?? 0) === best[p.marque]).map(p => p.slug));
      r = [...r].sort((a, b) => (flags.has(b.slug) ? 1 : 0) - (flags.has(a.slug) ? 1 : 0) || (b.noteExpert ?? 0) - (a.noteExpert ?? 0));
    } else {
      r = [...r].sort((a, b) => {
        switch (sort) {
          case 'note-desc': return (b.noteExpert ?? 0) - (a.noteExpert ?? 0);
          case 'price-asc': return (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity);
          case 'price-desc': return (getPrice(b) ?? 0) - (getPrice(a) ?? 0);
          case 'year-desc': return (b.annee ?? 0) - (a.annee ?? 0);
          case 'name-asc': return `${a.marqueLabel} ${a.modele}`.localeCompare(`${b.marqueLabel} ${b.modele}`);
          default: return 0;
        }
      });
    }
    return r;
  }, [products, f, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Active filter chips
  const chips: { label: string; key: keyof Filters; value: string | boolean }[] = [];
  if (f.usage) chips.push({ label: `${USAGES.find(u => u.value === f.usage)?.label}`, key: 'usage', value: '' });
  if (f.budget) chips.push({ label: `${BUDGETS.find(b => b.value === f.budget)?.label}`, key: 'budget', value: '' });
  if (f.brand) chips.push({ label: `${BRAND_LABEL[f.brand]}`, key: 'brand', value: '' });
  if (f.type) chips.push({ label: `${TYPE_LABEL[f.type] || f.type}`, key: 'type', value: '' });
  if (f.note) chips.push({ label: `Note ${f.note}+`, key: 'note', value: '' });
  if (f.year) chips.push({ label: `${f.year.replace('-', ' et avant')}`, key: 'year', value: '' });
  if (f.rechargeable) chips.push({ label: 'Rechargeable', key: 'rechargeable', value: false });
  if (f.bluetooth) chips.push({ label: 'Bluetooth', key: 'bluetooth', value: false });
  if (f.auracast) chips.push({ label: 'Auracast', key: 'auracast', value: false });

  const resetAll = useCallback(() => { setF(EMPTY); setSort('flagship'); setVisibleCount(PAGE_SIZE); }, []);

  return (
    <div>
      {/* Quiz CTA */}
      <a href="/catalogue/quiz/" className="block bg-gradient-to-r from-[#1B2E4A] to-[#2a4570] text-white rounded-2xl p-4 mb-4 no-underline hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-sans text-sm font-bold">Pas sûr de votre choix ?</div>
            <div className="font-sans text-xs opacity-80">5 questions, 3 recommandations</div>
          </div>
          <span className="text-lg shrink-0">&rarr;</span>
        </div>
      </a>

      {/* ─── Sticky filter bar ──────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#F8F5F0] pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-2">
        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => setShowFilters(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-[#1B2E4A] text-[#1B2E4A] rounded-xl px-4 py-3 text-sm font-semibold cursor-pointer hover:bg-[#1B2E4A] hover:text-white transition-colors min-h-[48px]">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="12" y1="18" x2="20" y2="18"/></svg>
            Filtrer{chips.length > 0 && <span className="bg-[#D97B3D] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{chips.length}</span>}
          </button>
          <button type="button" onClick={() => setShowSort(true)}
            className="bg-white border border-gray-300 text-[#1B2E4A] rounded-xl px-4 py-3 text-sm font-medium cursor-pointer hover:border-[#1B2E4A] transition-colors min-h-[48px] whitespace-nowrap">
            Trier
          </button>
          <span className="text-xs text-gray-500 whitespace-nowrap hidden sm:block">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {/* Active chips */}
        {chips.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
            {chips.map(c => (
              <button key={c.key + String(c.value)} type="button"
                onClick={() => set({ [c.key]: c.value } as Partial<Filters>)}
                className="shrink-0 flex items-center gap-1.5 bg-[#D97B3D]/10 text-[#D97B3D] border border-[#D97B3D]/30 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#D97B3D]/20 transition-colors min-h-[36px]">
                {c.label}
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            ))}
            <button type="button" onClick={resetAll} className="shrink-0 text-xs text-gray-500 hover:text-[#D97B3D] cursor-pointer whitespace-nowrap">
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* Count (mobile) */}
      <p className="text-xs text-gray-500 mb-3 font-sans sm:hidden">
        {filtered.length} appareil{filtered.length > 1 ? 's' : ''}
        {hasMore && ` — ${visible.length} affichés`}
      </p>

      {/* ─── Product grid ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
        {visible.map(p => <Card key={p.slug} product={p} />)}
      </div>

      {hasMore && (
        <div className="text-center mt-6">
          <button type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
            className="bg-white border-2 border-[#1B2E4A] text-[#1B2E4A] px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#1B2E4A] hover:text-white transition-colors cursor-pointer min-h-[48px]">
            Charger plus ({Math.min(PAGE_SIZE, filtered.length - visibleCount)})
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3 opacity-20" aria-hidden="true">?</p>
          <p className="text-base font-semibold text-[#1B2E4A] mb-2">Aucun résultat</p>
          <button type="button" onClick={resetAll} className="bg-[#D97B3D] text-white px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer">Voir tout</button>
        </div>
      )}

      {/* ─── Filter bottom sheet ───────────────────── */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Filtres">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="relative mt-auto bg-white rounded-t-2xl max-h-[85vh] flex flex-col animate-slide-up sm:max-w-lg sm:mx-auto sm:rounded-2xl sm:my-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="font-sans text-lg font-bold text-[#1B2E4A]">Filtres</h2>
              <div className="flex items-center gap-3">
                <button type="button" onClick={resetAll} className="text-sm text-gray-500 hover:text-[#D97B3D] cursor-pointer">Effacer</button>
                <button type="button" onClick={() => setShowFilters(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer" aria-label="Fermer">
                  <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              {/* Pour qui — always open */}
              <FilterSection title="Pour qui ?" defaultOpen>
                <RadioGroup options={[{ value: '', label: 'Tous' }, ...USAGES]} value={f.usage} onChange={v => set({ usage: v })} />
              </FilterSection>

              {/* Budget — always open */}
              <FilterSection title="Budget" defaultOpen>
                <RadioGroup options={[{ value: '', label: 'Tous les budgets' }, ...BUDGETS]} value={f.budget} onChange={v => set({ budget: v })} />
              </FilterSection>

              {/* Marque — collapsed */}
              <FilterSection title={`Marque${f.brand ? ` : ${BRAND_LABEL[f.brand]}` : ''}`}>
                <RadioGroup options={[{ value: '', label: 'Toutes' }, ...BRANDS.map(b => ({ value: b, label: BRAND_LABEL[b] }))]} value={f.brand} onChange={v => set({ brand: v })} />
              </FilterSection>

              {/* Type — collapsed */}
              <FilterSection title={`Type${f.type ? ` : ${TYPE_SHORT[f.type]}` : ''}`}>
                <RadioGroup options={[{ value: '', label: 'Tous' }, ...TYPES.map(t => ({ value: t, label: TYPE_LABEL[t] || t }))]} value={f.type} onChange={v => set({ type: v })} />
              </FilterSection>

              {/* Note — collapsed */}
              <FilterSection title={`Note expert${f.note ? ` : ${f.note}+` : ''}`}>
                <RadioGroup options={[{ value: '', label: 'Toutes' }, ...NOTES]} value={f.note} onChange={v => set({ note: v })} />
              </FilterSection>

              {/* Année — collapsed */}
              <FilterSection title={`Année${f.year ? ` : ${f.year.replace('-', ' et avant')}` : ''}`}>
                <RadioGroup options={[{ value: '', label: 'Toutes' }, ...YEARS]} value={f.year} onChange={v => set({ year: v })} />
              </FilterSection>

              {/* Toggles */}
              <div className="pt-4 border-t border-gray-100 mt-2 flex flex-col gap-3">
                <ToggleRow label="Rechargeable" checked={f.rechargeable} onChange={v => set({ rechargeable: v })} />
                <ToggleRow label="Bluetooth" checked={f.bluetooth} onChange={v => set({ bluetooth: v })} />
                <ToggleRow label="Auracast / LE Audio" checked={f.auracast} onChange={v => set({ auracast: v })} />
                <ToggleRow label="Inclure les arrêtés" checked={f.showLegacy} onChange={v => set({ showLegacy: v })} />
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="shrink-0 px-5 py-4 border-t border-gray-200">
              <button type="button" onClick={() => setShowFilters(false)}
                className="w-full bg-[#D97B3D] text-white rounded-xl py-3.5 text-base font-bold cursor-pointer hover:bg-[#c46a2e] transition-colors min-h-[56px]">
                Voir {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sort bottom sheet ─────────────────────── */}
      {showSort && (
        <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label="Trier">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSort(false)} />
          <div className="relative mt-auto bg-white rounded-t-2xl sm:max-w-sm sm:mx-auto sm:rounded-2xl sm:my-auto">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-sans text-lg font-bold text-[#1B2E4A]">Trier par</h2>
              <button type="button" onClick={() => setShowSort(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer" aria-label="Fermer">
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="px-5 py-3">
              {SORTS.map(s => (
                <label key={s.value} className="flex items-center gap-3 py-3 cursor-pointer min-h-[48px]">
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sort === s.value ? 'border-[#D97B3D]' : 'border-gray-300'}`}>
                    {sort === s.value && <span className="w-2.5 h-2.5 rounded-full bg-[#D97B3D]" />}
                  </span>
                  <input type="radio" name="sort" value={s.value} checked={sort === s.value}
                    onChange={() => { setSort(s.value); setVisibleCount(PAGE_SIZE); setShowSort(false); }} className="sr-only" />
                  <span className={`text-sm ${sort === s.value ? 'font-bold text-[#1B2E4A]' : 'text-gray-600'}`}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

// ─── Filter sub-components ────────────────────────

function FilterSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 py-3">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left cursor-pointer min-h-[44px]">
        <span className="font-sans text-sm font-bold text-[#1B2E4A]">{title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && <div className="pt-2 pb-1">{children}</div>}
    </div>
  );
}

function RadioGroup({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <label key={o.value} className={`inline-flex items-center px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors min-h-[44px] ${
          value === o.value ? 'bg-[#D97B3D]/10 border-[#D97B3D] text-[#D97B3D] font-semibold' : 'bg-white border-gray-200 text-[#1B2E4A] hover:border-gray-400'
        }`}>
          <input type="radio" name={o.label} value={o.value} checked={value === o.value}
            onChange={() => onChange(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer min-h-[44px]">
      <span className="text-sm text-[#1B2E4A]">{label}</span>
      <span className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#D97B3D]' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
      </span>
    </label>
  );
}

// ─── Score bar ─────────────────────────────────────
function ScoreBar({ value }: { value: number }) {
  const pct = Math.round((value / 10) * 100);
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-[#D97B3D]' : 'bg-gray-400';
  return <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>;
}

// ─── Product Card ──────────────────────────────────
function Card({ product: p }: { product: Product }) {
  const price = getPrice(p);
  const classe1 = p.classe === '1' || p.rac0;
  const niveauLabel = NIVEAU_LABELS[p.niveauPosition] || '';
  const typeShort = TYPE_SHORT[p.formeType] || p.formeType;
  const idealTags = getIdealTags(p);
  const scores = getSubScores(p);
  const puceSlug = p.puce ? PUCE_SLUG[p.puce] : null;

  return (
    <article className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${p.legacy ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
      {/* Top left badge */}
      {p.legacy ? (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-300 text-gray-700">Arrêté</span>
      ) : classe1 ? (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">RAC 0€</span>
      ) : null}
      {/* Top right */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-0.5 items-end">
        {niveauLabel && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-[#D97B3D]">{niveauLabel}</span>}
        {p.noteExpert && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1B2E4A] text-white">{p.noteExpert}</span>}
      </div>

      {/* Image */}
      <a href={`/catalogue/appareils/${p.slug}/`} className={`block h-32 sm:h-44 flex items-center justify-center no-underline ${p.legacy ? 'bg-gray-200/50 grayscale' : 'bg-gray-50'}`}>
        {p.image ? <img src={p.image} alt={`${p.marqueLabel} ${p.modele}`} className="w-full h-full object-contain p-3" loading="lazy" width="300" height="300" />
          : <span className="text-4xl opacity-15" aria-hidden="true">?</span>}
      </a>

      <div className="p-3 sm:p-4">
        {/* Brand + chip */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D97B3D]">{p.marqueLabel}</span>
          {puceSlug && <a href={`/catalogue/plateformes/${puceSlug}/`} className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 text-[9px] font-semibold no-underline hover:bg-purple-100">{p.puce}</a>}
        </div>

        <a href={`/catalogue/appareils/${p.slug}/`} className="no-underline">
          <h3 className="text-sm sm:text-base font-bold text-[#1B2E4A] leading-snug mb-1 group-hover:text-[#D97B3D] transition-colors line-clamp-2">
            {p.modele}{p.niveau ? ` ${p.niveau}` : ''}
          </h3>
        </a>

        {/* Ideal tags */}
        {idealTags.length > 0 && !p.legacy && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {idealTags.slice(0, 2).map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold">{t}</span>)}
          </div>
        )}

        {/* Spec tags */}
        <div className="flex flex-wrap gap-1 mb-2">
          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-[#1B2E4A]">{typeShort}</span>
          {p.fonctionnalites?.rechargeable && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px]">Rech.</span>}
          {p.connectivite?.auracast && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[10px] text-blue-700 font-semibold">LE Audio</span>}
        </div>

        {/* Sub-scores */}
        {p.noteExpert && !p.legacy && (
          <div className="grid grid-cols-4 gap-1 mb-2 text-[9px] text-gray-500">
            <div className="flex flex-col gap-0.5"><span>Son</span><ScoreBar value={scores.son} /></div>
            <div className="flex flex-col gap-0.5"><span>Conf.</span><ScoreBar value={scores.confort} /></div>
            <div className="flex flex-col gap-0.5"><span>Co.</span><ScoreBar value={scores.connect} /></div>
            <div className="flex flex-col gap-0.5"><span>Batt.</span><ScoreBar value={scores.batterie} /></div>
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-end justify-between pt-2 border-t border-gray-100">
          <div>
            {price ? (
              <div className={`text-sm sm:text-lg font-bold ${classe1 ? 'text-emerald-600' : 'text-[#1B2E4A]'}`}>{fmtPrice(price)}</div>
            ) : (
              <div className="text-xs text-gray-500">Sur devis</div>
            )}
          </div>
          <a href={p.legacy ? `/catalogue/appareils/${p.slug}/` : `/devis/?appareil=${p.slug}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold no-underline transition-colors ${
              p.legacy ? 'bg-gray-400 text-white' : 'bg-[#D97B3D] text-white hover:bg-[#c46a2e]'
            }`}>
            {p.legacy ? 'Fiche' : 'Devis'}
          </a>
        </div>
      </div>
    </article>
  );
}
