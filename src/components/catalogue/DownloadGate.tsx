/**
 * Formulaire lead-gen pour telecharger les fiches techniques PDF
 * Collecte : email, nom, prenom, telephone
 * Stocke le lead en Supabase puis declenche le telechargement
 */
import { useState } from 'react';

interface Props {
  pdfUrl: string;
  productName: string;
  productSlug: string;
}

export default function DownloadGate({ pdfUrl, productName, productSlug }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const data = {
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      nom: (form.elements.namedItem('nom') as HTMLInputElement).value,
      prenom: (form.elements.namedItem('prenom') as HTMLInputElement).value,
      telephone: (form.elements.namedItem('telephone') as HTMLInputElement).value,
      productSlug,
      productName,
      pdfUrl,
    };

    try {
      const res = await fetch('/api/download-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(err.error || 'Erreur serveur');
      }

      setSuccess(true);
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'download_fiche_produit', {
          event_category: 'conversion',
          event_label: productSlug,
          product_name: productName,
        });
      }
      // Declencher le telechargement
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = '';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-marine text-white px-6 py-3 rounded-xl font-sans text-sm font-semibold hover:bg-[#152439] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Telecharger la fiche technique (PDF)
      </button>
    );
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <p className="font-sans text-sm font-semibold text-emerald-700 mb-1">
          Telechargement lance
        </p>
        <p className="font-sans text-xs text-emerald-600">
          Si le telechargement ne demarre pas,{' '}
          <a href={pdfUrl} target="_blank" rel="noopener" className="underline">
            cliquez ici
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-creme border border-gray-200 rounded-xl p-5">
      <h3 className="font-sans text-base font-bold text-marine mb-1">
        Fiche technique {productName}
      </h3>
      <p className="font-sans text-xs text-gray-500 mb-4">
        Renseignez vos coordonnees pour telecharger la fiche technique PDF.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="dg-prenom" className="font-sans text-xs font-semibold text-gray-600">Prenom *</label>
          <input id="dg-prenom" name="prenom" type="text" required minLength={2}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dg-nom" className="font-sans text-xs font-semibold text-gray-600">Nom *</label>
          <input id="dg-nom" name="nom" type="text" required minLength={2}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dg-email" className="font-sans text-xs font-semibold text-gray-600">Email *</label>
          <input id="dg-email" name="email" type="email" required
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dg-tel" className="font-sans text-xs font-semibold text-gray-600">Telephone *</label>
          <input id="dg-tel" name="telephone" type="tel" required pattern="[0-9+\s\-\.]{10,}" title="Numero de telephone valide"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D97B3D] focus:border-transparent" />
        </div>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={loading}
            className="bg-[#D97B3D] text-white px-6 py-2.5 rounded-lg font-sans text-sm font-semibold hover:bg-[#c46a2e] transition-colors disabled:opacity-50">
            {loading ? 'Envoi...' : 'Telecharger le PDF'}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="text-sm text-gray-400 hover:text-gray-600">
            Annuler
          </button>
        </div>

        {error && (
          <p className="sm:col-span-2 font-sans text-xs text-red-600">{error}</p>
        )}

        <p className="sm:col-span-2 font-sans text-[10px] text-gray-400">
          En soumettant ce formulaire, vous acceptez d'etre contacte par un audioprothesiste partenaire.
          Vos donnees sont traitees conformement a notre politique de confidentialite.
        </p>
      </form>
    </div>
  );
}
