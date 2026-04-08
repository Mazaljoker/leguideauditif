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
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                  Caractéristique
                </th>
                {selectedProducts.map(p => (
                  <th key={p.slug} className="p-4 text-center">
                    <a href={`/catalogue/appareils/${p.slug}/`} className="text-[#1B2E4A] font-bold hover:text-[#D97B3D] no-underline">
                      {p.marqueLabel} {p.modele}
                    </a>
                    {p.niveau && <div className="text-xs text-[#D97B3D] font-semibold">{p.niveau}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Prix" values={selectedProducts.map(p => {
                const price = getPrice(p);
                return price ? formatPrice(price) : 'Sur devis';
              })} />
              <CompareRow label="Classe" values={selectedProducts.map(p =>
                p.classe === '1' ? '✓ Classe 1 (RAC 0€)' : p.classe === '2' ? 'Classe 2' : '—'
              )} highlightBest={vals => vals.map(v => v.includes('Classe 1'))} />
              <CompareRow label="Type" values={selectedProducts.map(p => FORME_TYPE_SHORT[p.formeType] || p.formeType)} />
              <CompareRow label="Niveau" values={selectedProducts.map(p => NIVEAU_LABELS[p.niveauPosition] || '—')} />
              <CompareRow label="Puce" values={selectedProducts.map(p => p.puce || '—')} />
              <CompareRow label="Année" values={selectedProducts.map(p => String(p.annee))}
                highlightBest={vals => vals.map(v => v === String(Math.max(...vals.map(Number))))} />
              <CompareRow label="Canaux" values={selectedProducts.map(p => p.specs?.canaux ? String(p.specs.canaux) : '—')}
                highlightBest={vals => vals.map(v => v !== '—' && Number(v) === Math.max(...vals.filter(x => x !== '—').map(Number)))} />
              <CompareRow label="Bluetooth" values={selectedProducts.map(p => p.connectivite?.bluetooth || '—')} />
              <CompareRow label="Auracast" values={selectedProducts.map(p =>
                p.connectivite?.auracast === true ? 'Oui ✓' : p.connectivite?.auracast === false ? 'Non' : '—'
              )} highlightBest={vals => vals.map(v => v.includes('Oui'))} />
              <CompareRow label="Rechargeable" values={selectedProducts.map(p =>
                p.fonctionnalites?.rechargeable === true ? 'Oui ✓' : p.fonctionnalites?.rechargeable === false ? 'Non' : '—'
              )} highlightBest={vals => vals.map(v => v.includes('Oui'))} />
              <CompareRow label="Autonomie" values={selectedProducts.map(p =>
                p.specs?.autonomie ? `${p.specs.autonomie}h` : '—'
              )} />
              <CompareRow label="Étanchéité" values={selectedProducts.map(p => p.specs?.ip || '—')} />
              <CompareRow label="Acouphènes" values={selectedProducts.map(p =>
                p.fonctionnalites?.acouphenes === true ? 'Oui ✓' : p.fonctionnalites?.acouphenes === false ? 'Non' : '—'
              )} highlightBest={vals => vals.map(v => v.includes('Oui'))} />
              <CompareRow label="Mains libres" values={selectedProducts.map(p =>
                p.connectivite?.mainLibre === true ? 'Oui ✓' : p.connectivite?.mainLibre === false ? 'Non' : '—'
              )} highlightBest={vals => vals.map(v => v.includes('Oui'))} />
              <CompareRow label="Application" values={selectedProducts.map(p => p.connectivite?.application || '—')} />
              <CompareRow label="Bobine T" values={selectedProducts.map(p =>
                p.fonctionnalites?.bobineT === true ? 'Oui ✓' : p.fonctionnalites?.bobineT === false ? 'Non' : '—'
              )} />
              <CompareRow label="Couleurs" values={selectedProducts.map(p => p.couleurs ? `${p.couleurs} coloris` : '—')} />
            </tbody>
          </table>

          {/* CTAs */}
          <div className="border-t-2 border-gray-200 p-4">
            <div className="grid gap-3" style={{ gridTemplateColumns: `10rem repeat(${selectedProducts.length}, 1fr)` }}>
              <div></div>
              {selectedProducts.map(p => (
                <div key={p.slug} className="text-center">
                  <a href={`/devis/?appareil=${p.slug}`}
                    className="inline-block bg-[#D97B3D] text-white px-5 py-2.5 rounded-lg text-sm font-semibold no-underline hover:bg-[#c46a2e] transition-colors">
                    Devis gratuit →
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : selectedProducts.length === 1 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm mb-8">
          <p className="text-lg font-semibold text-[#1B2E4A] mb-2">Ajoutez un deuxième appareil pour comparer</p>
          <p className="text-gray-500">Utilisez la barre de recherche ci-dessus</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm mb-8">
          <p className="text-5xl mb-4">⚖️</p>
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
