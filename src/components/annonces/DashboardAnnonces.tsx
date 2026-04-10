import { useState, useEffect, type FC } from 'react';
import { supabase } from '../../lib/supabase';
import { getUser } from '../../lib/auth';
import type { Annonce, AnnonceStatut } from '../../types/annonce';
import { CATEGORIES_META } from '../../types/annonce';

const STATUT_BADGES: Record<AnnonceStatut, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-800' },
  brouillon: { label: 'Brouillon', className: 'bg-gray-100 text-gray-600' },
  expiree: { label: 'Expiree', className: 'bg-amber-100 text-amber-800' },
  supprimee: { label: 'Supprimee', className: 'bg-red-100 text-red-700' },
  moderee: { label: 'Moderee', className: 'bg-red-100 text-red-700' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const DashboardAnnonces: FC = () => {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [unreadContacts, setUnreadContacts] = useState(0);

  const loadAnnonces = async () => {
    const { user } = await getUser();
    if (!user) {
      window.location.href = '/auth/login/?redirect=/annonces/mes-annonces/';
      return;
    }

    const { data } = await supabase
      .from('annonces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const list = (data as Annonce[]) ?? [];
    setAnnonces(list);

    // Compter les contacts non lus
    if (list.length > 0) {
      const ids = list.map((a) => a.id);
      const { count } = await supabase
        .from('annonces_contacts')
        .select('*', { count: 'exact', head: true })
        .in('annonce_id', ids)
        .eq('lu', false);
      setUnreadContacts(count ?? 0);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAnnonces();
  }, []);

  const handleRenew = async (annonce: Annonce) => {
    setActionLoading(annonce.id);
    const newExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await supabase
      .from('annonces')
      .update({
        expires_at: newExpires.toISOString(),
        statut: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', annonce.id);
    setActionLoading(null);
    loadAnnonces();
  };

  const handleDelete = async (annonce: Annonce) => {
    if (!confirm('Supprimer cette annonce ? Cette action est irreversible.')) return;
    setActionLoading(annonce.id);
    await supabase
      .from('annonces')
      .update({ statut: 'supprimee' })
      .eq('id', annonce.id);
    setActionLoading(null);
    loadAnnonces();
  };

  const handlePublish = async (annonce: Annonce) => {
    setActionLoading(annonce.id);
    await supabase
      .from('annonces')
      .update({ statut: 'active', updated_at: new Date().toISOString() })
      .eq('id', annonce.id);
    setActionLoading(null);
    loadAnnonces();
  };

  // Stats globales
  const activeCount = annonces.filter((a) => a.statut === 'active').length;
  const totalViews = annonces.reduce((sum, a) => sum + a.views_count, 0);
  const totalContacts = annonces.reduce((sum, a) => sum + a.contacts_count, 0);

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-gris)] font-sans">Chargement de vos annonces...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-5 text-center">
          <div className="font-sans text-3xl font-extrabold text-[var(--color-marine)]">{activeCount}</div>
          <div className="font-sans text-sm text-[var(--color-gris)] mt-1">Annonces actives</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-5 text-center">
          <div className="font-sans text-3xl font-extrabold text-[var(--color-marine)]">{totalViews}</div>
          <div className="font-sans text-sm text-[var(--color-gris)] mt-1">Vues totales</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-5 text-center">
          <div className="font-sans text-3xl font-extrabold text-[var(--color-marine)]">{totalContacts}</div>
          <div className="font-sans text-sm text-[var(--color-gris)] mt-1">Contacts recus</div>
        </div>
        <div className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-5 text-center">
          <div className="font-sans text-3xl font-extrabold text-[var(--color-orange)]">{unreadContacts}</div>
          <div className="font-sans text-sm text-[var(--color-gris)] mt-1">Non lus</div>
        </div>
      </div>

      {/* Liste des annonces */}
      {annonces.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-[var(--color-creme-dark)]">
          <svg className="w-12 h-12 mx-auto text-[var(--color-creme-dark)] mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          </svg>
          <p className="text-[var(--color-gris)] font-sans mb-4">Vous n'avez pas encore d'annonce.</p>
          <a
            href="/annonces/deposer/"
            className="inline-block px-6 py-2.5 bg-[var(--color-orange)] text-white font-sans font-semibold rounded-lg no-underline hover:bg-[var(--color-orange-dark)] transition-colors"
          >
            Deposer ma premiere annonce
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {annonces.map((annonce) => {
            const statutBadge = STATUT_BADGES[annonce.statut];
            const catMeta = CATEGORIES_META[annonce.categorie];
            const isExpired = annonce.statut === 'expiree' || new Date(annonce.expires_at) < new Date();
            const isActionLoading = actionLoading === annonce.id;

            return (
              <div
                key={annonce.id}
                className="bg-white rounded-xl border border-[var(--color-creme-dark)] p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Photo mini */}
                  <div className="w-20 h-14 rounded-lg bg-[var(--color-creme)] overflow-hidden shrink-0">
                    {annonce.photos.length > 0 ? (
                      <img
                        src={annonce.photos[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-[var(--color-creme-dark)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold font-sans ${statutBadge.className}`}>
                        {statutBadge.label}
                      </span>
                      <span className="text-xs text-[var(--color-gris)] font-sans">
                        {catMeta.label}
                      </span>
                    </div>
                    <a
                      href={`/annonces/${annonce.slug}/`}
                      className="font-sans font-bold text-[var(--color-marine)] hover:text-[var(--color-orange)] transition-colors no-underline line-clamp-1"
                    >
                      {annonce.titre}
                    </a>
                    <div className="flex items-center gap-4 mt-1 text-xs text-[var(--color-gris)] font-sans">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {annonce.views_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M17 18a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2" />
                          <rect width="18" height="18" x="3" y="4" rx="2" />
                          <circle cx="12" cy="10" r="2" />
                        </svg>
                        {annonce.contacts_count}
                      </span>
                      <span>Expire {formatDate(annonce.expires_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {annonce.statut === 'brouillon' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(annonce)}
                        disabled={isActionLoading}
                        className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold font-sans cursor-pointer hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        Publier
                      </button>
                    )}
                    {(isExpired || annonce.statut === 'expiree') && annonce.statut !== 'supprimee' && (
                      <button
                        type="button"
                        onClick={() => handleRenew(annonce)}
                        disabled={isActionLoading}
                        className="px-3 py-2 rounded-lg bg-[var(--color-orange)] text-white text-sm font-semibold font-sans cursor-pointer hover:bg-[var(--color-orange-dark)] transition-colors disabled:opacity-50"
                      >
                        Renouveler
                      </button>
                    )}
                    <a
                      href={`/annonces/${annonce.slug}/`}
                      className="px-3 py-2 rounded-lg border border-[var(--color-creme-dark)] text-sm font-semibold font-sans text-[var(--color-marine)] no-underline hover:border-[var(--color-orange)] transition-colors"
                    >
                      Voir
                    </a>
                    {annonce.statut !== 'supprimee' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(annonce)}
                        disabled={isActionLoading}
                        className="px-3 py-2 rounded-lg border border-red-200 text-sm font-semibold font-sans text-red-600 cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                        aria-label="Supprimer cette annonce"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 text-center">
        <a
          href="/annonces/deposer/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-orange)] text-white font-sans font-semibold rounded-lg no-underline hover:bg-[var(--color-orange-dark)] transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
          </svg>
          Deposer une nouvelle annonce
        </a>
      </div>
    </div>
  );
};

export default DashboardAnnonces;
