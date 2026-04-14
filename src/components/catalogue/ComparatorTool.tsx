/**
 * Comparateur interactif côte à côte (max 3 appareils)
 * React component (client:load) — lit les ?ids= depuis l'URL
 */
import { useState, useMemo, useEffect } from 'react';

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
  puce?: string;
  prix?: { eur?: { unitaire?: number; min?: number; max?: number } };
  specs?: { canaux?: number; bandes?: number; autonomie?: number; ip?: string; reductionBruit?: number; plageAdaptation?: string };
  connectivite?: { bluetooth?: string; auracast?: boolean; mainLibre?: boolean; application?: string };
  fonctionnalites?: { rechargeable?: boolean; acouphenes?: boolean; bobineT?: boolean; capteursSante?: string; antiFeedback?: string; micDirectionnels?: string };
  couleurs?: number;
}

interface Props {
  products: Product[];
}

const MAX_COMPARE = 3;

function getPrice(p: Product): number | undefined {
  return p.prix?.eur?.unitaire ?? p.prix?.eur?.min;
}

function formatPrice(n: number): string {
  return n.toLocaleString('fr-FR') + ' €';
}

const FORME_TYPE_SHORT: Record<string, string> = {
  'RIC': 'RIC', 'BTE': 'Contour', 'ITE': 'Intra',
  'ITC': 'Intra-canal', 'CIC': 'Mini intra', 'IIC': 'Invisible',
  'Slim RIC': 'Slim RIC', 'Earbud': 'Écouteur', 'CROS': 'CROS',
};

const NIVEAU_LABELS: Record<number, string> = {
  1: 'Essentiel', 2: 'Confort', 3: 'Avancé', 4: 'Premium', 5: 'Excellence',
};

export default function ComparatorTool({ products }: Props) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Lire les IDs depuis l'URL au chargement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ids = params.get('ids');
    if (ids) {
      const slugs = ids.split(',').filter(s => products.some(p => p.slug === s)).slice(0, MAX_COMPARE);
      setSelectedSlugs(slugs);
    }
  }, [products]);

  // Mettre à jour l'URL quand la sélection change
  useEffect(() => {
    if (selectedSlugs.length > 0) {
      const url = new URL(window.location.href);
      url.searchParams.set('ids', selectedSlugs.join(','));
      window.history.replaceState({}, '', url.toString());
    }
  }, [selectedSlugs]);

  const selectedProducts = useMemo(
    () => selectedSlugs.map(s => products.find(p => p.slug === s)).filter(Boolean) as Product[],
    [selectedSlugs, products]
  );

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter(p =>
        !selectedSlugs.includes(p.slug) &&
        (`${p.marqueLabel} ${p.modele} ${p.niveau || ''}`.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, products, selectedSlugs]);

  const addProduct = (slug: string) => {
    if (selectedSlugs.length < MAX_COMPARE && !selectedSlugs.includes(slug)) {
      setSelectedSlugs([...selectedSlugs, slug]);
      setSearchQuery('');
    }
  };

  const removeProduct = (slug: string) => {
    setSelectedSlugs(selectedSlugs.filter(s => s !== slug));
  };

  return (
    <div>
      {/* Sélecteur */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          {selectedProducts.map(p => (
            <div key={p.slug} className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <span className="text-sm font-semibold text-[#1B2E4A]">
                {p.marqueLabel} {p.modele} {p.niveau || ''}
              </span>
              <button onClick={() => removeProduct(p.slug)}
                className="text-gray-400 hover:text-red-500 text-lg leading-none"
                aria-label={`Retirer ${p.marqueLabel} ${p.modele}`}>
                ×
              </button>
            </div>
          ))}
          {selectedSlugs.length < MAX_COMPARE && (
            <span className="text-sm text-gray-400">
              {selectedSlugs.length === 0 ? 'Ajoutez des appareils ci-dessous' : `+ ${MAX_COMPARE - selectedSlugs.length} appareil(s)`}
            </span>
          )}
        </div>

        {selectedSlugs.length < MAX_COMPARE && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un appareil (ex: Phonak Audéo, Signia Styletto…)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm bg-white text-[#1B2E4A] focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent"
            />
            {filteredProducts.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {filteredProducts.map(p => {
                  const price = getPrice(p);
                  return (
                    <button key={p.slug} onClick={() => addProduct(p.slug)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex justify-between items-center">
                      <div>
                        <span className="text-sm font-semibold text-[#1B2E4A]">
                          {p.marqueLabel} {p.modele} {p.niveau || ''}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">{FORME_TYPE_SHORT[p.formeType] || p.formeType}</span>
                      </div>
                      {price && <span className="text-sm font-bold text-[#D97B3D]">{formatPrice(price)}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tableau comparatif */}
      {selectedProducts.length >= 2 ? (
        <CompareTable products={selectedProducts} />
      ) : selectedProducts.length === 1 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm mb-8">
          <p className="text-lg font-semibold text-[#1B2E4A] mb-2">Ajoutez un deuxième appareil pour comparer</p>
          <p className="text-gray-500">Utilisez la barre de recherche ci-dessus</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm mb-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
          <p className="text-lg font-semibold text-[#1B2E4A] mb-2">Sélectionnez 2 ou 3 appareils à comparer</p>
          <p className="text-gray-500 mb-6">Utilisez la barre de recherche ci-dessus ou ajoutez des appareils depuis le catalogue</p>
          <a href="/catalogue/"
            className="inline-block bg-[#D97B3D] text-white px-6 py-3 rounded-lg font-semibold no-underline hover:bg-[#c46a2e] transition-colors">
            Voir le catalogue →
          </a>
        </div>
      )}
    </div>
  );
}

function CompareTable({ products }: { products: Product[] }) {
  const [diffOnly, setDiffOnly] = useState(false);

  const rows: { label: string; section: string; values: string[]; best?: (vals: string[]) => boolean[] }[] = [
    // Général
    { label: 'Prix', section: 'Général', values: products.map(p => { const pr = getPrice(p); return pr ? formatPrice(pr) : 'Sur devis'; }) },
    { label: 'Classe', section: 'Général', values: products.map(p => p.classe === '1' ? 'Classe 1 (RAC 0)' : p.classe === '2' ? 'Classe 2' : '\u2014'), best: vals => vals.map(v => v.includes('Classe 1')) },
    { label: 'Type', section: 'Général', values: products.map(p => FORME_TYPE_SHORT[p.formeType] || p.formeType) },
    { label: 'Niveau', section: 'Général', values: products.map(p => NIVEAU_LABELS[p.niveauPosition] || '\u2014') },
    { label: 'Puce', section: 'Général', values: products.map(p => p.puce || '\u2014') },
    { label: 'Année', section: 'Général', values: products.map(p => String(p.annee)), best: vals => vals.map(v => v === String(Math.max(...vals.map(Number)))) },
    // Son
    { label: 'Canaux', section: 'Son', values: products.map(p => p.specs?.canaux ? String(p.specs.canaux) : '\u2014'), best: vals => vals.map(v => v !== '\u2014' && Number(v) === Math.max(...vals.filter(x => x !== '\u2014').map(Number))) },
    { label: 'Réd. bruit', section: 'Son', values: products.map(p => p.specs?.reductionBruit ? `${p.specs.reductionBruit} dB` : '\u2014') },
    { label: 'Anti-Larsen', section: 'Son', values: products.map(p => p.fonctionnalites?.antiFeedback || '\u2014') },
    { label: 'Micros dir.', section: 'Son', values: products.map(p => p.fonctionnalites?.micDirectionnels || '\u2014') },
    // Connectivité
    { label: 'Bluetooth', section: 'Connectivité', values: products.map(p => p.connectivite?.bluetooth || '\u2014') },
    { label: 'Auracast', section: 'Connectivité', values: products.map(p => p.connectivite?.auracast ? 'Oui' : 'Non'), best: vals => vals.map(v => v === 'Oui') },
    { label: 'Mains libres', section: 'Connectivité', values: products.map(p => p.connectivite?.mainLibre ? 'Oui' : 'Non'), best: vals => vals.map(v => v === 'Oui') },
    { label: 'Application', section: 'Connectivité', values: products.map(p => p.connectivite?.application || '\u2014') },
    // Confort & Batterie
    { label: 'Rechargeable', section: 'Confort & Batterie', values: products.map(p => p.fonctionnalites?.rechargeable ? 'Oui' : 'Non'), best: vals => vals.map(v => v === 'Oui') },
    { label: 'Autonomie', section: 'Confort & Batterie', values: products.map(p => p.specs?.autonomie ? `${p.specs.autonomie}h` : '\u2014') },
    { label: 'Étanchéité', section: 'Confort & Batterie', values: products.map(p => p.specs?.ip || '\u2014') },
    { label: 'Acouphènes', section: 'Confort & Batterie', values: products.map(p => p.fonctionnalites?.acouphenes ? 'Oui' : 'Non'), best: vals => vals.map(v => v === 'Oui') },
    { label: 'Bobine T', section: 'Confort & Batterie', values: products.map(p => p.fonctionnalites?.bobineT ? 'Oui' : 'Non') },
    { label: 'Coloris', section: 'Confort & Batterie', values: products.map(p => p.couleurs ? `${p.couleurs}` : '\u2014') },
  ];

  const filteredRows = diffOnly ? rows.filter(r => new Set(r.values).size > 1) : rows;
  const sections = [...new Set(filteredRows.map(r => r.section))];

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-x-auto mb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b-2 border-gray-200">
        <div className="flex">
          <div className="w-40 shrink-0 p-3 flex items-center">
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
              <input type="checkbox" checked={diffOnly} onChange={e => setDiffOnly(e.target.checked)} className="accent-[#D97B3D]" />
              Différences
            </label>
          </div>
          {products.map(p => (
            <div key={p.slug} className="flex-1 p-3 text-center min-w-[140px]">
              {p.image && <img src={p.image} alt="" className="h-12 mx-auto mb-1 object-contain" />}
              <a href={`/catalogue/appareils/${p.slug}/`} className="text-xs font-bold text-[#1B2E4A] hover:text-[#D97B3D] no-underline block">
                {p.marqueLabel} {p.modele}
              </a>
              {p.niveau && <div className="text-[10px] text-[#D97B3D] font-semibold">{p.niveau}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Grouped rows */}
      <table className="w-full text-sm">
        <tbody>
          {sections.map(section => (
            <>
              <tr key={`section-${section}`}>
                <td colSpan={products.length + 1} className="px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-[#D97B3D] bg-gray-50/50">
                  {section}
                </td>
              </tr>
              {filteredRows.filter(r => r.section === section).map(row => {
                const bests = row.best ? row.best(row.values) : row.values.map(() => false);
                return (
                  <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50/30">
                    <td className="p-3 w-40 font-medium text-gray-500 text-xs">{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className={`p-3 text-center text-sm min-w-[140px] ${bests[i] ? 'text-[#D97B3D] font-bold' : 'text-[#1B2E4A]'}`}>
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </>
          ))}
        </tbody>
      </table>

      {/* CTAs */}
      <div className="border-t-2 border-gray-200 p-4 flex gap-3">
        <div className="w-40 shrink-0" />
        {products.map(p => (
          <div key={p.slug} className="flex-1 text-center">
            <a href={`/devis/?appareil=${p.slug}`}
              className="inline-block bg-[#D97B3D] text-white px-5 py-2.5 rounded-lg text-sm font-semibold no-underline hover:bg-[#c46a2e] transition-colors">
              Devis gratuit &rarr;
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareRow({ label, values, highlightBest }: {
  label: string;
  values: string[];
  highlightBest?: (vals: string[]) => boolean[];
}) {
  const bests = highlightBest ? highlightBest(values) : values.map(() => false);
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="p-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`p-4 text-center font-medium ${bests[i] ? 'text-[#D97B3D] font-bold' : 'text-[#1B2E4A]'}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}
