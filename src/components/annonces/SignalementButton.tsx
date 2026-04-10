import { useState, type FC, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

interface SignalementButtonProps {
  annonceId: string;
}

const RAISONS = [
  { value: 'contenu_inapproprie', label: 'Contenu inapproprie' },
  { value: 'annonce_frauduleuse', label: 'Annonce frauduleuse' },
  { value: 'informations_fausses', label: 'Informations fausses' },
  { value: 'doublon', label: 'Doublon' },
  { value: 'autre', label: 'Autre' },
];

const SignalementButton: FC<SignalementButtonProps> = ({ annonceId }) => {
  const [open, setOpen] = useState(false);
  const [raison, setRaison] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!raison) return;

    setLoading(true);

    await supabase.from('annonces_signalements').insert({
      annonce_id: annonceId,
      raison,
      details: details || null,
    });

    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <p className="text-sm text-[var(--color-gris)] font-sans">
        Signalement envoye. Merci.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-[var(--color-gris)] font-sans cursor-pointer hover:text-red-500 transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" x2="4" y1="22" y2="15" />
        </svg>
        Signaler cette annonce
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-3">
            <label htmlFor="signal-raison" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Motif *
            </label>
            <select
              id="signal-raison"
              required
              value={raison}
              onChange={(e) => setRaison(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-red-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <option value="">Selectionnez</option>
              {RAISONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="signal-details" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
              Precisions
            </label>
            <textarea
              id="signal-details"
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-red-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 resize-y"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold font-sans cursor-pointer hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg border border-red-200 text-sm font-sans text-red-600 cursor-pointer hover:bg-red-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SignalementButton;
