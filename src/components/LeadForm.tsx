import { useState, type FC, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface LeadFormProps {
  centreSlug?: string;
}

const LeadForm: FC<LeadFormProps> = ({ centreSlug }) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const { error: dbError } = await supabase.from('leads').insert({
      first_name: formData.get('prenom') as string,
      phone: formData.get('tel') as string,
      zip_code: formData.get('cp') as string,
      hearing_loss_type: formData.get('perte') as string,
      source: centreSlug ? `centre/${centreSlug}` : 'homepage',
    });

    setLoading(false);
    if (dbError) {
      setError('Une erreur est survenue. Veuillez reessayer.');
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="my-8 rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-success)]/5 p-8 text-center">
        <p className="text-xl font-semibold text-[var(--color-success)] flex items-center justify-center gap-2">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Votre demande a bien ete envoyee
        </p>
        <p className="mt-2 text-[var(--color-gris)]">
          Un audioprothesiste de votre secteur vous contactera sous 48h.
        </p>
      </div>
    );
  }

  return (
    <aside className="my-8 rounded-lg border-2 border-[var(--color-orange)] bg-[var(--color-blanc)] p-8" aria-label="Demande de devis">
      <h3 className="font-serif text-xl font-bold text-[var(--color-marine)] mb-2">
        Demandez votre bilan auditif gratuit
      </h3>
      <p className="text-sm text-[var(--color-gris)] mb-6">
        Un audioprothesiste proche de chez vous vous rappelle sous 48h.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="lead-prenom" className="block text-sm font-medium text-[var(--color-marine)] mb-1">
            Prenom
          </label>
          <input
            id="lead-prenom"
            name="prenom"
            type="text"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="lead-tel" className="block text-sm font-medium text-[var(--color-marine)] mb-1">
            Telephone
          </label>
          <input
            id="lead-tel"
            name="tel"
            type="tel"
            required
            pattern="^(\+33|0)[1-9]\d{8}$"
            placeholder="06 12 34 56 78"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="lead-cp" className="block text-sm font-medium text-[var(--color-marine)] mb-1">
            Code postal
          </label>
          <input
            id="lead-cp"
            name="cp"
            type="text"
            required
            pattern="^\d{5}$"
            placeholder="75011"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="lead-perte" className="block text-sm font-medium text-[var(--color-marine)] mb-1">
            Type de perte auditive
          </label>
          <select
            id="lead-perte"
            name="perte"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Selectionnez</option>
            <option value="legere">Legere</option>
            <option value="moyenne">Moyenne</option>
            <option value="severe">Severe</option>
            <option value="profonde">Profonde</option>
            <option value="ne-sais-pas">Je ne sais pas</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-2 text-sm text-[var(--color-gris)]">
            <input type="checkbox" required className="mt-1" />
            <span>
              J'accepte que mes donnees soient traitees pour etre mis en relation avec un audioprothesiste.{' '}
              <a href="/politique-confidentialite/" className="text-[var(--color-orange)] underline">
                Politique de confidentialite
              </a>
            </span>
          </label>
        </div>

        {error && (
          <div className="md:col-span-2">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-[var(--color-blanc)] transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Envoi en cours...' : 'Demander un devis gratuit'}
          </button>
        </div>
      </form>
    </aside>
  );
};

export default LeadForm;
