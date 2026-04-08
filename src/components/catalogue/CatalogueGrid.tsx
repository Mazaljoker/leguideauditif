/**
 * Grille de catalogue interactive avec filtres côté client
 * React component (client:load) pour le filtrage dynamique
 */
import { useState, useMemo } from 'react';

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
}

interface Props {
  products: Product[];
}

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

const SORT_OPTIONS = [
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
  const [sort, setSort] = useState('year-desc');
  const [rechargeable, setRechargeable] = useState(false);
  const [acouphenes, setAcouphenes] = useState(false);

  const filtered = useMemo(() => {
    let result = products;

    if (brand) result = result.filter(p => p.marque === brand);
    if (type) result = result.filter(p => p.formeType === type);
    if (rechargeable) result = result.filter(p => p.fonctionnalites?.rechargeable);
    if (acouphenes) result = result.filter(p => p.fonctionnalites?.acouphenes);

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
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'price-asc': return (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity);
        case 'price-desc': return (getPrice(b) ?? 0) - (getPrice(a) ?? 0);
        case 'year-desc': return (b.annee ?? 0) - (a.annee ?? 0);
        case 'name-asc': return `${a.marqueLabel} ${a.modele}`.localeCompare(`${b.marqueLabel} ${b.modele}`);
        default: return 0;
      }
    });

    return result;
  }, [products, brand, type, budget, sort, rechargeable, acouphenes]);

  const resetFilters = () => {
    setBrand(''); setType(''); setBudget(''); setSort('year-desc');
    setRechargeable(false); setAcouphenes(false);
  };

  const hasFilters = brand || type || budget || rechargeable || acouphenes;

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 items-end">
          <FilterSelect label="Budget" value={budget} options={BUDGET_OPTIONS} onChange={setBudget} />
          <FilterSelect label="Marque" value={brand} options={BRAND_OPTIONS} onChange={setBrand} />
          <FilterSelect label="Type" value={type} options={TYPE_OPTIONS} onChange={setType} />
          <FilterSelect label="Trier par" value={sort} options={SORT_OPTIONS} onChange={setSort} />
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rechargeable} onChange={e => setRechargeable(e.target.checked)}
                className="w-4 h-4 accent-[#D97B3D] rounded" />
              <span className="text-sm font-medium text-[#1B2E4A]">🔋 Rechargeable</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={acouphenes} onChange={e => setAcouphenes(e.target.checked)}
                className="w-4 h-4 accent-[#D97B3D] rounded" />
              <span className="text-sm font-medium text-[#1B2E4A]">🔔 Acouphènes</span>
            </label>
          </div>
          {hasFilters && (
            <button onClick={resetFilters}
              className="text-sm text-gray-500 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-4 font-sans">
        {filtered.length} appareil{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
      </p>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(product => (
          <ProductCardReact key={product.slug} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-semibold text-[#1B2E4A] mb-2">Aucun appareil ne correspond à vos critères</p>
          <p className="text-gray-500 mb-4">Essayez d'élargir vos filtres</p>
          <button onClick={resetFilters}
            className="bg-[#D97B3D] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#c46a2e] transition-colors">
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
        className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-[#1B2E4A] focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ProductCardReact({ product }: { product: Product }) {
  const price = getPrice(product);
  const classe1 = product.classe === '1' || product.rac0;
  const niveauLabel = NIVEAU_LABELS[product.niveauPosition] || '';
  const typeShort = TYPE_SHORT[product.formeType] || product.formeType;

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group">
      {product.classe && (
        <span className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full text-xs font-bold ${
          classe1 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-[#1B2E4A]'
        }`}>
          {classe1 ? '✓ Classe 1 — RAC 0€' : 'Classe 2'}
        </span>
      )}
      {niveauLabel && (
        <span className="absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-[#D97B3D]">
          {niveauLabel}
        </span>
      )}

      <a href={`/catalogue/appareils/${product.slug}/`} className="block bg-gray-50 h-44 flex items-center justify-center no-underline">
        <span className="text-5xl opacity-20">👂</span>
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
            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">{product.specs.canaux} canaux</span>
          )}
          {product.fonctionnalites?.rechargeable && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">🔋</span>
          )}
          {product.connectivite?.bluetooth && (
            <span className="px-2 py-0.5 rounded bg-gray-100 text-xs text-[#1B2E4A]">📱</span>
          )}
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
          <a href={`/devis/?appareil=${product.slug}`}
            className="inline-flex items-center gap-1 bg-[#D97B3D] text-white px-4 py-2 rounded-lg text-sm font-semibold no-underline hover:bg-[#c46a2e] transition-colors">
            Devis →
          </a>
        </div>
      </div>
    </article>
  );
}
