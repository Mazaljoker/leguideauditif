import { useState, type FC } from 'react';
import { supabase } from '../../lib/supabase';
import type { Annonce, AnnonceContact, AnnonceCategorie } from '../../types/annonce';
import { CATEGORIES_META } from '../../types/annonce';
import ContactForm from './ContactForm';
import SignalementButton from './SignalementButton';

// TODO: reactiver quand les features premium seront fonctionnelles
const PREMIUM_FEATURES_ENABLED = false;

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

async function handleStripeCheckout(annonceId: string, userId: string, produit: string) {
  const res = await fetch('/api/annonces-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ annonce_id: annonceId, user_id: userId, produit }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
}

interface AnnonceDetailProps {
  annonce: Annonce;
  contacts?: AnnonceContact[];
  isOwner: boolean;
}

const AnnonceDetail: FC<AnnonceDetailProps> = ({ annonce, contacts: initialContacts = [], isOwner }) => {
  const [contacts, setContacts] = useState<AnnonceContact[]>(initialContacts);
  const catMeta = CATEGORIES_META[annonce.categorie];
  const prix = formatPrix(annonce);
  const location = [annonce.ville, annonce.departement ? `(${annonce.departement})` : '']
    .filter(Boolean)
    .join(' ');
  const createdDate = new Date(annonce.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const expiresDate = new Date(annonce.expires_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Contenu principal */}
      <div className="flex-1">
        {/* Owner banner */}
        {isOwner && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-5 mb-6">
            {/* Stats */}
            <div className="flex flex-wrap items-center gap-6 text-sm font-sans mb-4">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span className="font-medium text-blue-800">{annonce.views_count} vues</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2" />
                  <rect width="18" height="18" x="3" y="4" rx="2" />
                  <circle cx="12" cy="10" r="2" />
                </svg>
                <span className="font-medium text-blue-800">{annonce.contacts_count} contacts</span>
              </div>
              {annonce.contacts_count > 0 && annonce.views_count > 0 && (
                <span className="font-medium text-blue-800">
                  {((annonce.contacts_count / annonce.views_count) * 100).toFixed(1)}% taux de contact
                </span>
              )}
              <span className="text-blue-600">Expire le {expiresDate}</span>
            </div>
            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <a
                href="/annonces/mes-annonces/"
                className="px-4 py-2 rounded-lg border border-blue-300 text-sm font-semibold font-sans text-blue-800 no-underline hover:bg-blue-100 transition-colors"
              >
                Mes annonces
              </a>
              {PREMIUM_FEATURES_ENABLED && !annonce.is_premium && (
                <button
                  type="button"
                  onClick={() => handleStripeCheckout(annonce.id, annonce.user_id, 'premium')}
                  className="px-4 py-2 rounded-lg bg-[var(--color-orange)] text-sm font-semibold font-sans text-white cursor-pointer hover:bg-[var(--color-orange-dark)] transition-colors"
                >
                  Passer Premium — 29 EUR
                </button>
              )}
              {PREMIUM_FEATURES_ENABLED && !annonce.boost_until && (
                <button
                  type="button"
                  onClick={() => handleStripeCheckout(annonce.id, annonce.user_id, 'boost_semaine')}
                  className="px-4 py-2 rounded-lg border border-[var(--color-orange)] text-sm font-semibold font-sans text-[var(--color-orange)] cursor-pointer hover:bg-[var(--color-orange)]/5 transition-colors"
                >
                  Booster — 9 EUR/sem.
                </button>
              )}
              {PREMIUM_FEATURES_ENABLED && !annonce.contacts_unlocked && annonce.contacts_count > 0 && (
                <button
                  type="button"
                  onClick={() => handleStripeCheckout(annonce.id, annonce.user_id, 'unlock_contacts')}
                  className="px-4 py-2 rounded-lg border border-emerald-400 text-sm font-semibold font-sans text-emerald-700 cursor-pointer hover:bg-emerald-50 transition-colors"
                >
                  Debloquer contacts — 9 EUR
                </button>
              )}
              {PREMIUM_FEATURES_ENABLED && annonce.categorie === 'cession' && !annonce.is_premium && (
                <button
                  type="button"
                  onClick={() => handleStripeCheckout(annonce.id, annonce.user_id, 'pack_cession')}
                  className="px-4 py-2 rounded-lg border border-blue-400 text-sm font-semibold font-sans text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  Pack Cession — 99 EUR
                </button>
              )}
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold font-sans ${CATEGORIE_COLORS[annonce.categorie]}`}>
            {catMeta.label}
          </span>
          {annonce.sous_categorie && (
            <span className="inline-block px-3 py-1 rounded-full text-sm font-sans bg-gray-100 text-gray-600">
              {annonce.sous_categorie.replace(/_/g, ' ')}
            </span>
          )}
          {annonce.is_premium && (
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold font-sans bg-[var(--color-orange)]/10 text-[var(--color-orange)]">
              Premium
            </span>
          )}
          {annonce.is_verified && (
            <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold font-sans bg-emerald-100 text-emerald-700">
              Verifie par LeGuideAuditif
            </span>
          )}
        </div>

        {/* Titre */}
        <h1 className="font-sans text-2xl sm:text-3xl font-extrabold text-[var(--color-marine)] mb-4 leading-tight">
          {annonce.titre}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-gris)] font-sans mb-6">
          {location && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 2v4" /><path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
            Publiee le {createdDate}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {annonce.views_count} consultation{annonce.views_count > 1 ? 's' : ''}
          </span>
        </div>

        {/* Prix */}
        {prix && (
          <div className="rounded-xl bg-[var(--color-creme)] p-4 mb-6">
            <p className="font-sans text-2xl font-extrabold text-[var(--color-orange)]">
              {prix}
            </p>
          </div>
        )}

        {/* Photos */}
        {annonce.photos.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {annonce.photos.map((photo, idx) => (
                <img
                  key={idx}
                  src={photo}
                  alt={`${annonce.titre} — photo ${idx + 1}`}
                  className="w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="prose prose-lg max-w-none mb-8">
          <h2 className="font-sans text-xl font-bold text-[var(--color-marine)] mb-3">Description</h2>
          <div className="text-[var(--color-marine)] leading-relaxed whitespace-pre-line font-sans text-base">
            {annonce.description}
          </div>
        </div>

        {/* Contact du vendeur (si owner, afficher les infos) */}
        {isOwner && (
          <div className="rounded-xl bg-white border border-[var(--color-creme-dark)] p-5 mb-6">
            <h2 className="font-sans text-lg font-bold text-[var(--color-marine)] mb-3">
              Contacts recus ({contacts.length})
            </h2>
            {contacts.length === 0 ? (
              <p className="text-[var(--color-gris)] font-sans text-sm">
                Aucun contact recu pour le moment.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-creme)]">
                {contacts.map((contact) => {
                  const markAsRead = async () => {
                    if (contact.lu) return;
                    await supabase
                      .from('annonces_contacts')
                      .update({ lu: true })
                      .eq('id', contact.id);
                    setContacts((prev) =>
                      prev.map((c) => c.id === contact.id ? { ...c, lu: true } : c)
                    );
                  };

                  return (
                  <div
                    key={contact.id}
                    className={`py-3 first:pt-0 last:pb-0 ${!contact.lu ? 'bg-blue-50/50 -mx-2 px-2 rounded' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-sans font-semibold text-[var(--color-marine)] flex items-center gap-2">
                        {!contact.lu && (
                          <span className="w-2 h-2 rounded-full bg-[var(--color-orange)] shrink-0" title="Non lu" />
                        )}
                        {contact.nom}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-gris)] font-sans">
                          {new Date(contact.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {!contact.lu && (
                          <button
                            type="button"
                            onClick={markAsRead}
                            className="text-xs text-[var(--color-orange)] font-sans font-medium cursor-pointer hover:underline"
                          >
                            Marquer lu
                          </button>
                        )}
                      </div>
                    </div>
                    {annonce.contacts_unlocked ? (
                      <div className="text-sm text-[var(--color-gris)] font-sans space-y-0.5">
                        <p>{contact.email}</p>
                        {contact.telephone && <p>{contact.telephone}</p>}
                        {contact.profil && <p className="text-xs">Profil : {contact.profil.replace(/_/g, ' ')}</p>}
                        {contact.message && <p className="mt-1 text-[var(--color-marine)]">{contact.message}</p>}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-gris)] font-sans">
                        {contact.profil ? contact.profil.replace(/_/g, ' ') : 'Professionnel'} —{' '}
                        <span className="text-[var(--color-orange)] font-medium">
                          Debloquez les coordonnees pour 9 EUR
                        </span>
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Signalement */}
        {!isOwner && (
          <div className="mb-4">
            <SignalementButton annonceId={annonce.id} />
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-lg bg-[var(--color-creme)] px-4 py-3 text-xs text-[var(--color-gris)] font-sans">
          LeGuideAuditif.fr met en relation les professionnels mais ne participe pas aux transactions.
          Verifiez toujours les informations avant de vous engager.
        </div>
      </div>

      {/* Sidebar */}
      <div className="lg:w-80 shrink-0">
        <div className="sticky top-24 space-y-6">
          {/* Formulaire de contact (visiteur) */}
          {!isOwner && (
            <ContactForm annonceId={annonce.id} />
          )}

          {/* Info vendeur */}
          <div className="rounded-xl border border-[var(--color-creme-dark)] bg-white p-5">
            <h3 className="font-sans text-sm font-bold text-[var(--color-marine)] uppercase tracking-wider mb-3">Vendeur</h3>
            <p className="font-sans font-semibold text-[var(--color-marine)]">{annonce.contact_nom}</p>
            <p className="text-sm text-[var(--color-gris)] font-sans mt-1">
              Membre depuis {new Date(annonce.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnonceDetail;
