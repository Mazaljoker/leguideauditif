import { useState, type FC, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { CentrePlan } from '../types/centre';

interface LeadFormProps {
  centreSlug?: string;
  centreName?: string;
  variant?: CentrePlan;
}

const LeadForm: FC<LeadFormProps> = ({ centreSlug, centreName, variant = 'claimed' }) => {
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
          {centreName
            ? `${centreName} vous contactera sous 48h.`
            : 'Un audioprothesiste de votre secteur vous contactera sous 48h.'}
        </p>
      </div>
    );
  }

  // Titre et sous-titre selon variant
  const title = variant === 'premium' && centreName
    ? `Prendre rendez-vous chez ${centreName}`
    : variant === 'claimed' && centreName
      ? `Demandez votre bilan auditif chez ${centreName}`
      : 'Demandez votre bilan auditif gratuit';

  const subtitle = variant === 'premium' && centreName
    ? `${centreName} vous rappelle sous 48h pour un bilan auditif gratuit.`
    : variant === 'claimed' && centreName
      ? `${centreName} vous rappelle sous 48h.`
      : 'Un audioprothesiste proche de chez vous vous rappelle sous 48h.';

  // Style du conteneur selon variant
  const containerClass = variant === 'premium'
    ? 'my-8 rounded-lg border-2 border-[var(--color-orange)] bg-[var(--color-blanc)] p-8'
    : 'my-8 rounded-lg border-2 border-[var(--color-orange)] bg-[var(--color-blanc)] p-8';

  const buttonLabel = variant === 'premium'
    ? 'Etre rappele gratuitement'
    : 'Demander un devis gratuit';

  return (
    <aside className={containerClass} aria-label="Demande de devis">
      {/* Warning rpps */}
      {variant === 'rpps' && (
        <div className="mb-4 rounded-lg bg-[#FCEBEB] px-4 py-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-[#A32D2D] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <p className="text-[11px] font-medium text-[#A32D2D]">
            Attention : ce centre n'a pas revendique sa fiche. Votre demande sera orientee vers un centre verifie a proximite.
          </p>
        </div>
      )}

      {/* Header premium avec icone bouclier */}
      <div className="flex items-start gap-3 mb-2">
        {variant === 'premium' && (
          <div className="w-8 h-8 rounded-full bg-[var(--color-orange)] flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
          </div>
        )}
        <div>
          <h3 className="font-serif text-xl font-bold text-[var(--color-marine)] mb-1">
            {title}
          </h3>
          <p className="text-sm text-[var(--color-gris)] mb-4">
            {subtitle}
          </p>
        </div>
      </div>

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
            {loading ? 'Envoi en cours...' : buttonLabel}
          </button>
        </div>
      </form>

      {/* Message sous le formulaire selon variant */}
      {variant === 'rpps' && (
        <p className="text-[11px] font-medium text-[#A32D2D] mt-4 text-center">
          Attention : ce centre n'a pas revendique sa fiche. Votre demande sera orientee vers un centre verifie a proximite.
        </p>
      )}
      {variant === 'claimed' && (
        <p className="text-[11px] text-[var(--color-gris)] mt-4 text-center italic">
          Les fiches premium recoivent les demandes en priorite.
        </p>
      )}
      {variant === 'premium' && (
        <p className="text-[11px] text-[var(--color-gris)] mt-4 text-center">
          Votre demande est envoyee directement a ce centre.
        </p>
      )}
    </aside>
  );
};

export default LeadForm;
