import { useState, useEffect, type FC } from 'react';
import { supabase } from '../../lib/supabase';
import type { Annonce, AnnonceCategorie } from '../../types/annonce';
import { SOUS_CATEGORIES, DEPARTEMENTS } from '../../types/annonce';
import AnnonceCard from './AnnonceCard';

interface AnnonceListingProps {
  categorie?: AnnonceCategorie;
}

const PAGE_SIZE = 20;

const AnnonceListing: FC<AnnonceListingProps> = ({ categorie }) => {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filtres
  const [sousCategorie, setSousCategorie] = useState('');
  const [departement, setDepartement] = useState('');
  const [photoOnly, setPhotoOnly] = useState(false);

  const sousCategories = categorie ? SOUS_CATEGORIES[categorie] : [];

  const fetchAnnonces = async () => {
    setLoading(true);

    let query = supabase
      .from('annonces')
      .select('*', { count: 'exact' })
      .eq('statut', 'active');

    if (categorie) {
      query = query.eq('categorie', categorie);
    }
    if (sousCategorie) {
      query = query.eq('sous_categorie', sousCategorie);
    }
    if (departement) {
      query = query.eq('departement', departement);
    }
    if (photoOnly) {
      query = query.not('photos', 'eq', '{}');
    }

    // Tri : boosted > premium > date
    query = query
      .order('boost_until', { ascending: false, nullsFirst: false })
      .order('is_premium', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const { data, count } = await query;

    setAnnonces((data as Annonce[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchAnnonces();
  }, [categorie, sousCategorie, departement, photoOnly, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar filtres */}
      <aside className="lg:w-64 shrink-0" aria-label="Filtres de recherche">
        <div className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-5 sticky top-24">
          <h3 className="font-sans text-sm font-bold text-[var(--color-marine)] uppercase tracking-wider mb-4">Filtres</h3>

          {sousCategories.length > 0 && (
            <div className="mb-4">
              <label htmlFor="filter-sous-cat" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
                Type
              </label>
              <select
                id="filter-sous-cat"
                value={sousCategorie}
                onChange={(e) => { setSousCategorie(e.target.value); setPage(0); }}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-3 py-2 text-sm focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
              >
                <option value="">Tous</option>
                {sousCategories.map((sc) => (
                  <option key={sc.value} value={sc.value}>{sc.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="filter-dept" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Departement
            </label>
            <select
              id="filter-dept"
              value={departement}
              onChange={(e) => { setDepartement(e.target.value); setPage(0); }}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-3 py-2 text-sm focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
            >
              <option value="">Tous</option>
              {DEPARTEMENTS.map((d) => (
                <option key={d.code} value={d.code}>{d.code} - {d.nom}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm font-sans text-[var(--color-marine)] cursor-pointer">
            <input
              type="checkbox"
              checked={photoOnly}
              onChange={(e) => { setPhotoOnly(e.target.checked); setPage(0); }}
              className="rounded"
            />
            Avec photo uniquement
          </label>
        </div>
      </aside>

      {/* Grille annonces */}
      <div className="flex-1">
        {/* Compteur */}
        <p className="text-sm text-[var(--color-gris)] font-sans mb-4">
          {total} annonce{total > 1 ? 's' : ''} trouvee{total > 1 ? 's' : ''}
        </p>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-[var(--color-gris)] font-sans">Chargement...</p>
          </div>
        ) : annonces.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-[var(--color-creme-dark)]">
            <svg className="w-12 h-12 mx-auto text-[var(--color-creme-dark)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-[var(--color-gris)] font-sans">Aucune annonce pour le moment.</p>
            <a
              href="/annonces/deposer/"
              className="mt-4 inline-block px-6 py-2.5 bg-[var(--color-orange)] text-white font-sans font-semibold rounded-lg no-underline hover:bg-[var(--color-orange-dark)] transition-colors"
            >
              Deposer la premiere annonce
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {annonces.map((annonce) => (
                <AnnonceCard key={annonce.id} annonce={annonce} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="flex justify-center gap-2 mt-8" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 rounded-lg border border-[var(--color-creme-dark)] font-sans text-sm text-[var(--color-marine)] disabled:opacity-40 cursor-pointer disabled:cursor-default hover:border-[var(--color-orange)] transition-colors"
                  aria-label="Page precedente"
                >
                  Precedent
                </button>
                <span className="px-4 py-2 text-sm font-sans text-[var(--color-gris)]">
                  {page + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 rounded-lg border border-[var(--color-creme-dark)] font-sans text-sm text-[var(--color-marine)] disabled:opacity-40 cursor-pointer disabled:cursor-default hover:border-[var(--color-orange)] transition-colors"
                  aria-label="Page suivante"
                >
                  Suivant
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AnnonceListing;
