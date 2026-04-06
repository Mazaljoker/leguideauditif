import { useState, type FC, type FormEvent } from 'react';

const LeadForm: FC = () => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: Connect to backend/Supabase
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="my-8 rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-success)]/5 p-8 text-center">
        <p className="text-xl font-semibold text-[var(--color-success)]">
          ✓ Votre demande a bien été envoyée
        </p>
        <p className="mt-2 text-[var(--color-gris)]">
          Un audioprothésiste de votre secteur vous contactera sous 48h.
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
        Un audioprothésiste proche de chez vous vous rappelle sous 48h.
      </p>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="lead-prenom" className="block text-sm font-medium text-[var(--color-marine)] mb-1">
            Prénom
          </label>
          <input
            id="lead-prenom"
            type="text"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="lead-tel" className="block text-sm font-medium text-[var(--color-marine)] mb-1">
            Téléphone
          </label>
          <input
            id="lead-tel"
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
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Sélectionnez</option>
            <option value="legere">Légère</option>
            <option value="moyenne">Moyenne</option>
            <option value="severe">Sévère</option>
            <option value="profonde">Profonde</option>
            <option value="ne-sais-pas">Je ne sais pas</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="flex items-start gap-2 text-sm text-[var(--color-gris)]">
            <input type="checkbox" required className="mt-1" />
            <span>
              J'accepte que mes données soient traitées pour être mis en relation avec un audioprothésiste.
              <a href="/politique-confidentialite/" className="text-[var(--color-orange)] underline">
                Politique de confidentialité
              </a>
            </span>
          </label>
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-[var(--color-blanc)] transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer"
          >
            Demander un devis gratuit
          </button>
        </div>
      </form>
    </aside>
  );
};

export default LeadForm;