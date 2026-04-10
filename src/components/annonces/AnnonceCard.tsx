import type { FC } from 'react';
import type { Annonce, AnnonceCategorie } from '../../types/annonce';
import { CATEGORIES_META } from '../../types/annonce';

const CATEGORIE_COLORS: Record<AnnonceCategorie, string> = {
  cession: 'bg-blue-100 text-blue-800',
  emploi: 'bg-emerald-100 text-emerald-800',
  remplacement: 'bg-purple-100 text-purple-800',
  materiel: 'bg-amber-100 text-amber-800',
};

function formatPrix(annonce: Annonce): string {
  if (!annonce.prix_type || annonce.prix_type === 'sur_demande') return 'Prix sur demande';
  if (annonce.prix_type === 'gratuit') return 'Gratuit';

  const format = (cents: number) => new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(cents / 100);

  const suffix =
    annonce.prix_type === 'salaire_annuel' ? '/an' :
    annonce.prix_type === 'salaire_mensuel' ? '/mois' :
    annonce.prix_type === 'tjm' ? '/jour' : '';

  if (annonce.prix_min && annonce.prix_max) {
    return `${format(annonce.prix_min)} - ${format(annonce.prix_max)}${suffix}`;
  }
  if (annonce.prix_min) return `A partir de ${format(annonce.prix_min)}${suffix}`;
  if (annonce.prix_max) return `Jusqu'a ${format(annonce.prix_max)}${suffix}`;
  return annonce.prix_type === 'negociable' ? 'Prix negociable' : '';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface AnnonceCardProps {
  annonce: Annonce;
  variant?: 'listing' | 'dashboard';
}

const AnnonceCard: FC<AnnonceCardProps> = ({ annonce, variant = 'listing' }) => {
  const catMeta = CATEGORIES_META[annonce.categorie];
  const prix = formatPrix(annonce);
  const location = [annonce.ville, annonce.departement ? `(${annonce.departement})` : '']
    .filter(Boolean)
    .join(' ');

  return (
    <article className="bg-white rounded-xl border border-[var(--color-creme-dark)] overflow-hidden hover:shadow-md transition-shadow group">
      <a href={`/annonces/${annonce.slug}/`} className="block no-underline">
        {/* Photo */}
        {annonce.photos.length > 0 ? (
          <div className="aspect-[16/10] bg-[var(--color-creme)] overflow-hidden">
            <img
              src={annonce.photos[0]}
              alt={annonce.titre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[16/10] bg-[var(--color-creme)] flex items-center justify-center">
            <svg className="w-10 h-10 text-[var(--color-creme-dark)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        <div className="p-4">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold font-sans ${CATEGORIE_COLORS[annonce.categorie]}`}>
              {catMeta.label}
            </span>
            {annonce.is_premium && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold font-sans bg-[var(--color-orange)]/10 text-[var(--color-orange)]">
                Premium
              </span>
            )}
            {annonce.is_verified && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold font-sans bg-emerald-100 text-emerald-700">
                Verifie
              </span>
            )}
          </div>

          {/* Titre */}
          <h3 className="font-sans text-base font-bold text-[var(--color-marine)] leading-snug mb-1 group-hover:text-[var(--color-orange)] transition-colors line-clamp-2">
            {annonce.titre}
          </h3>

          {/* Localisation */}
          {location && (
            <p className="flex items-center gap-1 text-sm text-[var(--color-gris)] font-sans mb-2">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </p>
          )}

          {/* Prix */}
          {prix && (
            <p className="font-sans text-lg font-bold text-[var(--color-orange)] mb-2">
              {prix}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-[var(--color-gris)] font-sans pt-2 border-t border-[var(--color-creme)]">
            <span>{formatDate(annonce.created_at)}</span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {annonce.views_count}
            </span>
          </div>
        </div>
      </a>
    </article>
  );
};

export default AnnonceCard;
