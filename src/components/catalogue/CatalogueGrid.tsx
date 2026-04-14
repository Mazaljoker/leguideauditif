/**
 * Grille de catalogue — filtres avancés, tri flagship, pagination, cards enrichies
 * B1 (Product Cards refonte) + B2 (Filtrage avancé) combinés
 */
import { useState, useMemo, useCallback } from 'react';

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

interface Props {
  products: Product[];
}

const PAGE_SIZE = 18;

// ─── Options ────────────────────────────────────────
const BRAND_OPTIONS = [
  { value: '', label: 'Toutes les marques' },
  { value: 'phonak', label: 'Phonak' }, { value: 'signia', label: 'Signia' },
  { value: 'oticon', label: 'Oticon' }, { value: 'resound', label: 'ReSound' },
  { value: 'starkey', label: 'Starkey' }, { value: 'widex', label: 'Widex' },
  { value: 'unitron', label: 'Unitron' }, { value: 'bernafon', label: 'Bernafon' },
  { value: 'philips', label: 'Philips' }, { value: 'rexton', label: 'Rexton' },
  { value: 'audio-service', label: 'Audio Service' }, { value: 'hansaton', label: 'Hansaton' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'RIC', label: 'RIC — Micro-contour' },
  { value: 'BTE', label: 'BTE — Contour' },
  { value: 'ITE', label: 'ITE — Intra' },
  { value: 'CIC', label: 'CIC — Mini intra' },
  { value: 'IIC', label: 'IIC — Invisible' },
  { value: 'Slim RIC', label: 'Slim RIC' },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Tous les budgets' },
  { value: 'classe1', label: 'Classe 1 — RAC 0€' },
  { value: '0-1000', label: 'Moins de 1 000€' },
  { value: '1000-1500', label: '1 000€ – 1 500€' },
  { value: '1500-2000', label: '1 500€ – 2 000€' },
  { value: '2000+', label: 'Plus de 2 000€' },
];

const NOTE_OPTIONS = [
  { value: '', label: 'Toutes les notes' },
  { value: '9', label: '9+ Excellence' },
  { value: '8', label: '8+ Très bien' },
  { value: '7', label: '7+ Bien' },
];

const YEAR_OPTIONS = [
  { value: '', label: 'Toutes les années' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023-', label: '2023 et avant' },
];

const USAGE_OPTIONS = [
  { value: '', label: 'Tous les profils' },
  { value: 'premier', label: 'Premier appareillage' },
  { value: 'acouphenes', label: 'Acouphènes' },
  { value: 'discret', label: 'Discrétion maximale' },
  { value: 'actif', label: 'Professionnel actif' },
];

const SORT_OPTIONS = [
  { value: 'flagship', label: "Flagships d'abord" },
  { value: 'note-desc', label: 'Meilleures notes' },
  { value: 'year-desc', label: 'Plus récents' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'name-asc', label: 'A → Z' },
];

function getPrice(p: Product): number | undefined {
  return p.prix?.eur?.unitaire ?? p.prix?.eur?.min;
}

function fmtPrice(n: number): string {
  return n.toLocaleString('fr-FR') + ' €';
}

const NIVEAU_LABELS: Record<number, string> = {
  1: 'Essentiel', 2: 'Confort', 3: 'Avancé', 4: 'Premium', 5: 'Excellence',
};

const TYPE_ICON: Record<string, string> = {
  'RIC': 'M3 7h4l2-4h6l2 4h4v10H3z', // simplified ear icon
  'BTE': 'M7 2v4M17 2v4M3 10h18v10H3z',
  'ITE': 'M12 2a8 8 0 0 0-8 8v4a8 8 0 0 0 16 0v-4a8 8 0 0 0-8-8z',
  'CIC': 'M9 3a6 6 0 0 0-6 6v6a6 6 0 0 0 12 0V9a6 6 0 0 0-6-6z',
  'IIC': 'M10 4a5 5 0 0 0-5 5v6a5 5 0 0 0 10 0V9a5 5 0 0 0-5-5z',
  'Slim RIC': 'M4 8h3l1.5-3h7l1.5 3h3v8H4z',
};

const TYPE_SHORT: Record<string, string> = {
  'RIC': 'RIC', 'BTE': 'Contour', 'ITE': 'Intra', 'ITC': 'Intra-canal',
  'CIC': 'Mini intra', 'IIC': 'Invisible', 'Slim RIC': 'Slim RIC',
  'Earbud': 'Écouteur', 'CROS': 'CROS',
};

// ─── Puce slug mapping ────────────────────────────
const PUCE_SLUG: Record<string, string> = {
  'Sirius': 'oticon-sirius', 'Polaris R': 'oticon-polaris-r', 'Polaris': 'oticon-polaris', 'Velox S': 'oticon-velox-s',
  'DEEPSONIC': 'phonak-deepsonic', 'ERA': 'phonak-era', 'PRISM': 'phonak-prism',
  'IX Platform': 'signia-ix', 'AX Platform': 'signia-ax',
  'GN 2.0': 'resound-gn2', 'Dual-chip 360 + DNN': 'resound-360-dnn', '360 Chip': 'resound-360', '360 Chip + ML AI': 'resound-360-ml',
  'G3 Neuro': 'starkey-g3-neuro', 'G2 Neuro': 'starkey-g2-neuro', 'Neuro Processor': 'starkey-neuro-processor',
  'W1': 'widex-w1', 'Integra OS': 'unitron-integra-os', 'DECS': 'bernafon-decs',
};

// ─── "Idéal pour" tags ──────────────────────────────
function getIdealTags(p: Product): string[] {
  const tags: string[] = [];
  if ((p.classe === '1' || p.rac0) || (getPrice(p) && getPrice(p)! < 1000)) tags.push('Premier appareil');
  if (p.fonctionnalites?.acouphenes) tags.push('Acouphènes');
  if (p.formeType === 'IIC' || p.formeType === 'CIC') tags.push('Ultra-discret');
  if ((p.specs?.canaux ?? 0) >= 20 && p.connectivite?.bluetooth) tags.push('Env. bruyant');
  if (p.connectivite?.auracast) tags.push('Connecté');
  return tags;
}

// ─── Sub-scores (derived, no new data) ──────────────
function getSubScores(p: Product) {
  const base = p.noteExpert ?? 5;
  const canaux = p.specs?.canaux ?? 8;
  return {
    son: Math.min(10, base + (canaux >= 20 ? 0.5 : canaux >= 12 ? 0 : -0.5)),
    confort: Math.min(10, base + (p.fonctionnalites?.rechargeable ? 0.3 : -0.2)),
    connectivite: Math.min(10, base + (p.connectivite?.auracast ? 0.5 : p.connectivite?.bluetooth ? 0 : -1)),
    batterie: Math.min(10, base + (p.fonctionnalites?.rechargeable ? 0.5 : -0.5)),
  };
}

// ─── Usage filter logic ──────────────────────────────
function matchesUsage(p: Product, usage: string): boolean {
  switch (usage) {
    case 'premier': return p.classe === '1' || p.rac0 === true || (getPrice(p) ?? Infinity) < 1000;
    case 'acouphenes': return p.fonctionnalites?.acouphenes === true;
    case 'discret': return p.formeType === 'IIC' || p.formeType === 'CIC' || p.formeType === 'Slim RIC';
    case 'actif': return (p.noteExpert ?? 0) >= 8 && p.connectivite?.bluetooth !== undefined;
    default: return true;
  }
}

// ═══════════════════════════════════════════════════════
export default function CatalogueGrid({ products }: Props) {
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [budget, setBudget] = useState('');
  const [note, setNote] = useState('');
  const [year, setYear] = useState('');
  const [usage, setUsage] = useState('');
  const [sort, setSort] = useState('flagship');
  const [rechargeable, setRechargeable] = useState(false);
  const [bluetooth, setBluetooth] = useState(false);
  const [auracast, setAuracast] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const reset = useCallback(() => setVisibleCount(PAGE_SIZE), []);

  const filtered = useMemo(() => {
    let result = products;
    if (!showLegacy) result = result.filter(p => !p.legacy);
    if (brand) result = result.filter(p => p.marque === brand);
    if (type) result = result.filter(p => p.formeType === type);
    if (usage) result = result.filter(p => matchesUsage(p, usage));
    if (rechargeable) result = result.filter(p => p.fonctionnalites?.rechargeable);
    if (bluetooth) result = result.filter(p => p.connectivite?.bluetooth);
    if (auracast) result = result.filter(p => p.connectivite?.auracast);
    if (note) result = result.filter(p => (p.noteExpert ?? 0) >= parseInt(note));
    if (year) {
      if (year.endsWith('-')) result = result.filter(p => p.annee <= parseInt(year));
      else result = result.filter(p => p.annee === parseInt(year));
    }
    if (budget === 'classe1') result = result.filter(p => p.classe === '1' || p.rac0);
    else if (budget) {
      const [min, max] = budget.split('-').map(s => parseInt(s.replace('+', '')) || 0);
      result = result.filter(p => {
        const price = getPrice(p);
        if (!price) return false;
        if (budget.endsWith('+')) return price >= min;
        return price >= min && price <= (max || Infinity);
      });
    }

    // Sort
    if (sort === 'flagship') {
      const bestByBrand: Record<string, number> = {};
      for (const p of result) {
        const s = p.noteExpert ?? 0;
        if (!bestByBrand[p.marque] || s > bestByBrand[p.marque]) bestByBrand[p.marque] = s;
      }
      const flags = new Set(result.filter(p => p.enAvant || (p.noteExpert ?? 0) === bestByBrand[p.marque]).map(p => p.slug));
      result = [...result].sort((a, b) => {
        const d = (flags.has(b.slug) ? 1 : 0) - (flags.has(a.slug) ? 1 : 0);
        return d || (b.noteExpert ?? 0) - (a.noteExpert ?? 0);
      });
    } else {
      result = [...result].sort((a, b) => {
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
    return result;
  }, [products, brand, type, budget, note, year, usage, sort, rechargeable, bluetooth, auracast, showLegacy]);

  // Counts for filter options
  const counts = useMemo(() => {
    const base = showLegacy ? products : products.filter(p => !p.legacy);
    const c: Record<string, number> = {};
    for (const o of BRAND_OPTIONS) if (o.value) c['brand_' + o.value] = base.filter(p => p.marque === o.value).length;
    for (const o of TYPE_OPTIONS) if (o.value) c['type_' + o.value] = base.filter(p => p.formeType === o.value).length;
    return c;
  }, [products, showLegacy]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const hasFilters = brand || type || budget || note || year || usage || rechargeable || bluetooth || auracast || showLegacy;
  const activeCount = [brand, type, budget, note, year, usage].filter(Boolean).length + [rechargeable, bluetooth, auracast, showLegacy].filter(Boolean).length;

  const resetAll = useCallback(() => {
    setBrand(''); setType(''); setBudget(''); setNote(''); setYear(''); setUsage('');
    setSort('flagship'); setRechargeable(false); setBluetooth(false); setAuracast(false);
    setShowLegacy(false); setVisibleCount(PAGE_SIZE);
  }, []);

  return (
    <div>
      {/* Quiz CTA */}
      <a href="/catalogue/quiz/" className="block bg-gradient-to-r from-[#1B2E4A] to-[#2a4570] text-white rounded-2xl p-5 mb-5 no-underline hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <div>
            <div className="font-sans text-base font-bold">Pas sûr de votre choix ?</div>
            <div className="font-sans text-sm opacity-80">Répondez à 5 questions, on vous recommande 3 appareils adaptés</div>
          </div>
          <span className="ml-auto text-lg">&rarr;</span>
        </div>
      </a>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-3">
          <FSelect label="Pour qui ?" value={usage} options={USAGE_OPTIONS} onChange={v => { setUsage(v); reset(); }} />
          <FSelect label="Budget" value={budget} options={BUDGET_OPTIONS} onChange={v => { setBudget(v); reset(); }} />
          <FSelect label="Marque" value={brand} options={BRAND_OPTIONS.map(o => ({ ...o, label: o.value ? `${o.label} (${counts['brand_' + o.value] ?? 0})` : o.label }))} onChange={v => { setBrand(v); reset(); }} />
          <FSelect label="Type" value={type} options={TYPE_OPTIONS.map(o => ({ ...o, label: o.value ? `${o.label} (${counts['type_' + o.value] ?? 0})` : o.label }))} onChange={v => { setType(v); reset(); }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <FSelect label="Note expert" value={note} options={NOTE_OPTIONS} onChange={v => { setNote(v); reset(); }} />
          <FSelect label="Année" value={year} options={YEAR_OPTIONS} onChange={v => { setYear(v); reset(); }} />
          <FSelect label="Trier par" value={sort} options={SORT_OPTIONS} onChange={v => { setSort(v); reset(); }} />
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
          <Pill label="Rechargeable" on={rechargeable} set={v => { setRechargeable(v); reset(); }} />
          <Pill label="Bluetooth" on={bluetooth} set={v => { setBluetooth(v); reset(); }} />
          <Pill label="Auracast / LE Audio" on={auracast} set={v => { setAuracast(v); reset(); }} />
          <span className="text-gray-300 mx-0.5">|</span>
          <Pill label="Inclure les arrêtés" on={showLegacy} set={v => { setShowLegacy(v); reset(); }} />
          {hasFilters && (
            <>
              <span className="text-gray-300 mx-0.5">|</span>
              <button type="button" onClick={resetAll} className="text-sm text-[#D97B3D] font-medium hover:underline cursor-pointer">
                Réinitialiser ({activeCount})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 mb-4 font-sans">
        {filtered.length} appareil{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
        {hasMore && <span className="text-gray-400"> — {visible.length} affichés</span>}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map(p => <Card key={p.slug} product={p} />)}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center mt-8">
          <button type="button" onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
            className="inline-flex items-center gap-2 bg-white border-2 border-[#1B2E4A] text-[#1B2E4A] px-8 py-3 rounded-xl text-base font-semibold hover:bg-[#1B2E4A] hover:text-white transition-colors cursor-pointer">
            Charger plus
            <span className="text-sm font-normal opacity-70">({Math.min(PAGE_SIZE, filtered.length - visibleCount)})</span>
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4 opacity-20" aria-hidden="true">?</p>
          <p className="text-lg font-semibold text-[#1B2E4A] mb-2">Aucun résultat</p>
          <p className="text-gray-500 mb-4">Élargissez vos filtres</p>
          <button type="button" onClick={resetAll} className="bg-[#D97B3D] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#c46a2e] cursor-pointer">
            Voir tout
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────

function FSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-[#1B2E4A] focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent cursor-pointer">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Pill({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium cursor-pointer transition-colors ${
      on ? 'bg-[#D97B3D]/10 border-[#D97B3D] text-[#D97B3D]' : 'bg-white border-gray-300 text-[#1B2E4A] hover:border-gray-400'
    }`}>
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} className="sr-only" />
      {on && <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
      {label}
    </label>
  );
}

function ScoreBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-[#D97B3D]' : 'bg-gray-400';
  return (
    <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Card({ product }: { product: Product }) {
  const price = getPrice(product);
  const classe1 = product.classe === '1' || product.rac0;
  const niveauLabel = NIVEAU_LABELS[product.niveauPosition] || '';
  const typeShort = TYPE_SHORT[product.formeType] || product.formeType;
  const idealTags = getIdealTags(product);
  const scores = getSubScores(product);
  const puceSlug = product.puce ? PUCE_SLUG[product.puce] : null;

  return (
    <article className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${product.legacy ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
      {/* Top badges */}
      {product.legacy ? (
        <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold bg-gray-300 text-gray-700">Arrêté</span>
      ) : product.classe ? (
        <span className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold ${classe1 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#1B2E4A]'}`}>
          {classe1 ? 'RAC 0\u00A0€' : 'Classe 2'}
        </span>
      ) : null}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
        {niveauLabel && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-[#D97B3D]">{niveauLabel}</span>}
        {product.noteExpert && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1B2E4A] text-white">{product.noteExpert}/10</span>}
      </div>

      {/* Image */}
      <a href={`/catalogue/appareils/${product.slug}/`} className={`block h-44 flex items-center justify-center no-underline ${product.legacy ? 'bg-gray-200/50 grayscale' : 'bg-gray-50'}`}>
        {product.image ? (
          <img src={product.image} alt={`${product.marqueLabel} ${product.modele}`} className="w-full h-full object-contain p-4" loading="lazy" width="300" height="300" />
        ) : (
          <span className="text-5xl opacity-15 font-serif" aria-hidden="true">?</span>
        )}
      </a>

      <div className="p-4">
        {/* Brand + chip */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#D97B3D]">{product.marqueLabel}</span>
          {puceSlug && (
            <a href={`/catalogue/plateformes/${puceSlug}/`} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 text-[10px] font-semibold no-underline hover:bg-purple-100 transition-colors">
              {product.puce}
            </a>
          )}
        </div>

        {/* Title */}
        <a href={`/catalogue/appareils/${product.slug}/`} className="no-underline">
          <h3 className="text-base font-bold text-[#1B2E4A] leading-snug mb-2 group-hover:text-[#D97B3D] transition-colors">
            {product.marqueLabel} {product.modele}{product.niveau ? ` ${product.niveau}` : ''}
          </h3>
        </a>

        {/* "Idéal pour" tags */}
        {idealTags.length > 0 && !product.legacy && (
          <div className="flex flex-wrap gap-1 mb-2">
            {idealTags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Spec tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">{typeShort}</span>
          {product.fonctionnalites?.rechargeable && <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">Rech.</span>}
          {product.connectivite?.auracast && <span className="px-2 py-0.5 rounded bg-blue-50 text-xs text-blue-700 font-semibold">LE Audio</span>}
          <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-500">{product.annee}</span>
        </div>

        {/* Sub-scores (only for non-legacy with noteExpert) */}
        {product.noteExpert && !product.legacy && (
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-[10px] text-gray-500">
            <div className="flex flex-col gap-0.5"><span>Son</span><ScoreBar value={scores.son} /></div>
            <div className="flex flex-col gap-0.5"><span>Confort</span><ScoreBar value={scores.confort} /></div>
            <div className="flex flex-col gap-0.5"><span>Connect.</span><ScoreBar value={scores.connectivite} /></div>
            <div className="flex flex-col gap-0.5"><span>Batterie</span><ScoreBar value={scores.batterie} /></div>
          </div>
        )}

        {/* Price + CTA */}
        <div className="flex items-end justify-between pt-3 border-t border-gray-200">
          <div>
            {price ? (
              <>
                <div className={`text-lg font-bold ${classe1 ? 'text-emerald-600' : 'text-[#1B2E4A]'}`}>
                  {product.prix?.eur?.min && product.prix?.eur?.min !== price
                    ? `À partir de ${fmtPrice(product.prix.eur.min)}`
                    : fmtPrice(price)}
                </div>
                <div className={`text-xs ${classe1 ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {classe1 ? 'Reste à charge : 0€' : 'par appareil'}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Prix sur devis</div>
            )}
          </div>
          <a href={product.legacy ? `/catalogue/appareils/${product.slug}/` : `/devis/?appareil=${product.slug}`}
            className={`inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-colors ${
              product.legacy ? 'bg-gray-400 text-white hover:bg-gray-500' : 'bg-[#D97B3D] text-white hover:bg-[#c46a2e]'
            }`}>
            {product.legacy ? 'Fiche' : 'Devis \u2192'}
          </a>
        </div>
      </div>
    </article>
  );
}
