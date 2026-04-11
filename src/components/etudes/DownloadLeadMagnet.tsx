import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

const DOWNLOAD_URL = '/data/deserts-auditifs-2026.json';

export default function DownloadLeadMagnet() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await supabase.from('leads').insert({
        first_name: email.split('@')[0],
        phone: '',
        zip_code: '',
        hearing_loss_type: 'download-etude',
        source: 'etude-deserts-download',
      });

      setDone(true);
      window.open(DOWNLOAD_URL, '_blank');
    } catch (_err) {
      setError('Une erreur est survenue. Le fichier reste accessible ci-dessous.');
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger card */}
      <div className="bg-[#1B2E4A] rounded-2xl px-6 py-6 text-white">
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-1">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-sans text-lg font-bold mb-1">
              Telechargez les donnees completes par departement
            </h3>
            <p className="font-sans text-sm text-white/70 mb-4">
              Obtenez le fichier JSON avec les 101 departements (ratios, populations, classements) pour votre propre analyse ou article.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#D97B3D] text-white font-sans font-semibold rounded-lg hover:bg-[#c16a30] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Telecharger les donnees
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Telecharger les donnees"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1 text-[#1B2E4A]/40 hover:text-[#1B2E4A] transition-colors"
              aria-label="Fermer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {done ? (
              <div className="text-center py-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <h3 className="font-sans text-xl font-bold text-[#1B2E4A] mb-2">
                  Telechargement lance
                </h3>
                <p className="font-sans text-sm text-[#1B2E4A]/60 mb-4">
                  Si le telechargement ne demarre pas, cliquez ci-dessous :
                </p>
                <a
                  href={DOWNLOAD_URL}
                  download
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#1B2E4A] text-white font-sans font-semibold rounded-lg hover:bg-[#2a4570] transition-colors"
                >
                  Telecharger le fichier JSON
                </a>
                {error && <p className="mt-3 font-sans text-xs text-[#C62828]">{error}</p>}
              </div>
            ) : (
              <>
                <h3 className="font-sans text-xl font-bold text-[#1B2E4A] mb-2">
                  Recevez les donnees completes
                </h3>
                <p className="font-sans text-sm text-[#1B2E4A]/60 mb-6">
                  Entrez votre email professionnel pour acceder au telechargement immediat. Nous ne vous enverrons rien d'autre.
                </p>
                <form onSubmit={handleSubmit}>
                  <label htmlFor="dl-email" className="block font-sans text-sm font-medium text-[#1B2E4A] mb-2">
                    Votre email professionnel
                  </label>
                  <input
                    id="dl-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nom@media.fr"
                    className="w-full px-4 py-3 rounded-lg border border-[#1B2E4A]/20 font-sans text-base text-[#1B2E4A] placeholder:text-[#1B2E4A]/30 focus:outline-none focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent mb-4"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-5 py-3 bg-[#B55E28] text-white font-sans font-semibold rounded-lg hover:bg-[#9A4D1C] transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Chargement...' : 'Telecharger maintenant'}
                  </button>
                  <p className="mt-3 font-sans text-xs text-[#1B2E4A]/40 text-center">
                    Donnees sous licence ouverte. Pas de spam, promis.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
