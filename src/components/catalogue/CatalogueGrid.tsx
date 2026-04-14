/**
 * Grille de catalogue interactive avec filtres, tri flagship et pagination "Charger plus"
 * React component (client:load) pour le filtrage dynamique
 */
import { useState, useMemo, useCallback } from 'react';

interface Product {
  slug: string;
  marque: string;
  marqueLabel: string;
  groupe: string;
  modele: string;
  formeType: string;
  niveau?: string;
  niveauPosition: number;
  classe?: string;
  rac0?: boolean;
  annee: number;
  prix?: { eur?: { unitaire?: number; min?: number; max?: number } };
  specs?: { canaux?: number };
  connectivite?: { bluetooth?: string; auracast?: boolean };
  fonctionnalites?: { rechargeable?: boolean; acouphenes?: boolean };
  image?: string;
  legacy?: boolean;
  legacyReason?: string;
  enAvant?: boolean;
  noteExpert?: number;
}

interface Props {
  products: Product[];
}

const PAGE_SIZE = 18;

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
  { value: 'RIC', label: 'RIC — Écouteur déporté' },
  { value: 'BTE', label: 'BTE — Contour classique' },
  { value: 'ITE', label: 'ITE — Intra-auriculaire' },
  { value: 'CIC', label: 'CIC — Dans le conduit' },
  { value: 'IIC', label: 'IIC — Invisible' },
  { value: 'Slim RIC', label: 'Slim RIC — Ultra-discret' },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Tous les budgets' },
  { value: 'classe1', label: 'Classe 1 — 0€ reste à charge' },
  { value: '0-1000', label: 'Moins de 1 000€' },
  { value: '1000-1500', label: '1 000€ – 1 500€' },
  { value: '1500-2000', label: '1 500€ – 2 000€' },
  { value: '2000+', label: 'Plus de 2 000€' },
];

const NOTE_OPTIONS = [
  { value: '', label: 'Toutes les notes' },
  { value: '9', label: '9+ — Excellence' },
  { value: '8', label: '8+ — Très bien' },
  { value: '7', label: '7+ — Bien' },
];

const YEAR_OPTIONS = [
  { value: '', label: 'Toutes les années' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023-', label: '2023 et avant' },
];

const SORT_OPTIONS = [
  { value: 'flagship', label: 'Flagships d\'abord' },
  { value: 'note-desc', label: 'Meilleures notes' },
  { value: 'year-desc', label: 'Plus récents' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'name-asc', label: 'A → Z' },
];

function getPrice(p: Product): number | undefined {
  return p.prix?.eur?.unitaire ?? p.prix?.eur?.min;
}

function formatPrice(n: number): string {
  return n.toLocaleString('fr-FR') + ' €';
}

const NIVEAU_LABELS: Record<number, string> = {
  1: 'Essentiel', 2: 'Confort', 3: 'Avancé', 4: 'Premium', 5: 'Excellence',
};

const TYPE_SHORT: Record<string, string> = {
  'RIC': 'RIC', 'BTE': 'Contour', 'ITE': 'Intra', 'ITC': 'Intra-canal',
  'CIC': 'Mini intra', 'IIC': 'Invisible', 'Slim RIC': 'Slim RIC',
  'Earbud': 'Écouteur', 'CROS': 'CROS',
};

export default function CatalogueGrid({ products }: Props) {
  const [brand, setBrand] = useState('');
  const [type, setType] = useState('');
  const [budget, setBudget] = useState('');
  const [note, setNote] = useState('');
  const [year, setYear] = useState('');
  const [sort, setSort] = useState('flagship');
  const [rechargeable, setRechargeable] = useState(false);
  const [acouphenes, setAcouphenes] = useState(false);
  const [bluetooth, setBluetooth] = useState(false);
  const [auracast, setAuracast] = useState(false);
  const [showLegacy, setShowLegacy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let result = products;

    // Masquer les legacy par défaut
    if (!showLegacy) result = result.filter(p => !p.legacy);

    if (brand) result = result.filter(p => p.marque === brand);
    if (type) result = result.filter(p => p.formeType === type);
    if (rechargeable) result = result.filter(p => p.fonctionnalites?.rechargeable);
    if (acouphenes) result = result.filter(p => p.fonctionnalites?.acouphenes);
    if (bluetooth) result = result.filter(p => p.connectivite?.bluetooth);
    if (auracast) result = result.filter(p => p.connectivite?.auracast);

    if (note) {
      const minNote = parseInt(note);
      result = result.filter(p => (p.noteExpert ?? 0) >= minNote);
    }

    if (year) {
      if (year.endsWith('-')) {
        const maxYear = parseInt(year);
        result = result.filter(p => p.annee <= maxYear);
      } else {
        const targetYear = parseInt(year);
        result = result.filter(p => p.annee === targetYear);
      }
    }

    if (budget === 'classe1') {
      result = result.filter(p => p.classe === '1' || p.rac0);
    } else if (budget) {
      const [min, max] = budget.split('-').map(s => s === '' ? 0 : parseInt(s.replace('+', '')));
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
        const score = p.noteExpert ?? 0;
        if (!bestByBrand[p.marque] || score > bestByBrand[p.marque]) {
          bestByBrand[p.marque] = score;
        }
      }
      const flagshipSlugs = new Set<string>();
      for (const p of result) {
        if (p.enAvant || (p.noteExpert ?? 0) === bestByBrand[p.marque]) {
          flagshipSlugs.add(p.slug);
        }
      }
      result = [...result].sort((a, b) => {
        const aFlag = flagshipSlugs.has(a.slug) ? 1 : 0;
        const bFlag = flagshipSlugs.has(b.slug) ? 1 : 0;
        if (aFlag !== bFlag) return bFlag - aFlag;
        return (b.noteExpert ?? 0) - (a.noteExpert ?? 0);
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
  }, [products, brand, type, budget, note, year, sort, rechargeable, acouphenes, bluetooth, auracast, showLegacy]);

  // Reset visible count when filters change
  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const resetFilters = useCallback(() => {
    setBrand(''); setType(''); setBudget(''); setNote(''); setYear('');
    setSort('flagship'); setRechargeable(false); setAcouphenes(false);
    setBluetooth(false); setAuracast(false); setShowLegacy(false);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + PAGE_SIZE);
  }, []);

  const hasFilters = brand || type || budget || note || year || rechargeable || acouphenes || bluetooth || auracast || showLegacy;

  // Count active filters
  const activeCount = [brand, type, budget, note, year].filter(Boolean).length
    + [rechargeable, acouphenes, bluetooth, auracast, showLegacy].filter(Boolean).length;

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
        {/* Row 1: Selects */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          <FilterSelect label="Budget" value={budget} options={BUDGET_OPTIONS} onChange={(v) => { setBudget(v); setVisibleCount(PAGE_SIZE); }} />
          <FilterSelect label="Marque" value={brand} options={BRAND_OPTIONS} onChange={(v) => { setBrand(v); setVisibleCount(PAGE_SIZE); }} />
          <FilterSelect label="Type" value={type} options={TYPE_OPTIONS} onChange={(v) => { setType(v); setVisibleCount(PAGE_SIZE); }} />
          <FilterSelect label="Note expert" value={note} options={NOTE_OPTIONS} onChange={(v) => { setNote(v); setVisibleCount(PAGE_SIZE); }} />
          <FilterSelect label="Année" value={year} options={YEAR_OPTIONS} onChange={(v) => { setYear(v); setVisibleCount(PAGE_SIZE); }} />
          <FilterSelect label="Trier par" value={sort} options={SORT_OPTIONS} onChange={(v) => { setSort(v); setVisibleCount(PAGE_SIZE); }} />
        </div>

        {/* Row 2: Toggles + filters expand */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
          <Toggle label="Rechargeable" checked={rechargeable} onChange={(v) => { setRechargeable(v); setVisibleCount(PAGE_SIZE); }} />
          <Toggle label="Bluetooth" checked={bluetooth} onChange={(v) => { setBluetooth(v); setVisibleCount(PAGE_SIZE); }} />
          <Toggle label="Auracast / LE Audio" checked={auracast} onChange={(v) => { setAuracast(v); setVisibleCount(PAGE_SIZE); }} />
          <Toggle label="Acouphènes" checked={acouphenes} onChange={(v) => { setAcouphenes(v); setVisibleCount(PAGE_SIZE); }} />

          <span className="text-xs text-gray-300 mx-0.5">|</span>
          <Toggle label="Inclure les arrêtés" checked={showLegacy} onChange={(v) => { setShowLegacy(v); setVisibleCount(PAGE_SIZE); }} />

          {hasFilters && (
            <>
              <span className="text-xs text-gray-400 mx-1">|</span>
              <button onClick={resetFilters}
                className="text-sm text-[#D97B3D] font-medium hover:underline cursor-pointer">
                Réinitialiser ({activeCount})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4 font-sans">
        {filtered.length} appareil{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
        {hasMore && <span> — {visible.length} affichés</span>}
      </p>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map(product => (
          <ProductCardReact key={product.slug} product={product} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center mt-8">
          <button type="button" onClick={loadMore}
            className="inline-flex items-center gap-2 bg-white border-2 border-[#1B2E4A] text-[#1B2E4A] px-8 py-3 rounded-xl text-base font-semibold hover:bg-[#1B2E4A] hover:text-white transition-colors cursor-pointer">
            Charger plus d'appareils
            <span className="text-sm font-normal opacity-70">
              ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} suivants)
            </span>
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4 opacity-30" aria-hidden="true">?</p>
          <p className="text-lg font-semibold text-[#1B2E4A] mb-2">Aucun appareil ne correspond à vos critères</p>
          <p className="text-gray-500 mb-4">Essayez d'élargir vos filtres</p>
          <button onClick={resetFilters}
            className="bg-[#D97B3D] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#c46a2e] transition-colors cursor-pointer">
            Voir tous les appareils
          </button>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: {
  label: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
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

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium cursor-pointer transition-colors ${
      checked
        ? 'bg-[#D97B3D]/10 border-[#D97B3D] text-[#D97B3D]'
        : 'bg-white border-gray-300 text-[#1B2E4A] hover:border-gray-400'
    }`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="sr-only" />
      {checked && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      )}
      {label}
    </label>
  );
}

function ProductCardReact({ product }: { product: Product }) {
  const price = getPrice(product);
  const classe1 = product.classe === '1' || product.rac0;
  const niveauLabel = NIVEAU_LABELS[product.niveauPosition] || '';
  const typeShort = TYPE_SHORT[product.formeType] || product.formeType;

  return (
    <article className={`rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${product.legacy ? 'bg-gray-100 opacity-75' : 'bg-white'}`}>
      {product.legacy ? (
        <span className="absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold bg-gray-300 text-gray-700">
          Arrêté
        </span>
      ) : product.classe ? (
        <span className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold ${
          classe1 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#1B2E4A]'
        }`}>
          {classe1 ? 'Classe 1 — RAC 0\u00A0\u20AC' : 'Classe 2'}
        </span>
      ) : null}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
        {niveauLabel && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-[#D97B3D]">
            {niveauLabel}
          </span>
        )}
        {product.noteExpert && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#1B2E4A] text-white">
            {product.noteExpert}/10
          </span>
        )}
      </div>

      <a href={`/catalogue/appareils/${product.slug}/`} className={`block h-44 flex items-center justify-center no-underline ${product.legacy ? 'bg-gray-200/50 grayscale' : 'bg-gray-50'}`}>
        {product.image ? (
          <img src={product.image} alt={`${product.marqueLabel} ${product.modele}`} className="w-full h-full object-contain p-4" loading="lazy" width="300" height="300" />
        ) : (
          <span className="text-5xl opacity-20 font-serif" aria-hidden="true">?</span>
        )}
      </a>

      <div className="p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#D97B3D] mb-1">
          {product.marqueLabel}
        </div>
        <a href={`/catalogue/appareils/${product.slug}/`} className="no-underline">
          <h3 className="text-base font-bold text-[#1B2E4A] leading-snug mb-2 group-hover:text-[#D97B3D] transition-colors">
            {product.marqueLabel} {product.modele}{product.niveau ? ` ${product.niveau}` : ''}
          </h3>
        </a>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">{typeShort}</span>
          {product.specs?.canaux && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">{product.specs.canaux} can.</span>
          )}
          {product.fonctionnalites?.rechargeable && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">Rech.</span>
          )}
          {product.connectivite?.bluetooth && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">BT</span>
          )}
          {product.connectivite?.auracast && (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-xs text-blue-700 font-semibold">LE Audio</span>
          )}
          <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-500">{product.annee}</span>
        </div>

        <div className="flex items-end justify-between pt-3 border-t border-gray-200">
          <div>
            {price ? (
              <>
                <div className={`text-xl font-bold ${classe1 ? 'text-emerald-600' : 'text-[#1B2E4A]'}`}>
                  {formatPrice(price)}
                </div>
                <div className={`text-xs ${classe1 ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {classe1 ? 'Reste à charge : 0€' : 'par appareil'}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">Prix sur devis</div>
            )}
          </div>
          {product.legacy ? (
            <a href={`/catalogue/appareils/${product.slug}/`}
              className="inline-flex items-center gap-1 bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold no-underline hover:bg-gray-500 transition-colors">
              Voir la fiche
            </a>
          ) : (
            <a href={`/devis/?appareil=${product.slug}`}
              className="inline-flex items-center gap-1 bg-[#D97B3D] text-white px-4 py-2 rounded-lg text-sm font-semibold no-underline hover:bg-[#c46a2e] transition-colors">
              Devis &rarr;
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
