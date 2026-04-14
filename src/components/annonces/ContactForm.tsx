import { useState, type FC, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { PROFILS_CONTACT } from '../../types/annonce';

interface ContactFormProps {
  annonceId: string;
}

const ContactForm: FC<ContactFormProps> = ({ annonceId }) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    // Honeypot check
    if (formData.get('website')) {
      setSubmitted(true);
      return;
    }

    const contactData = {
      annonce_id: annonceId,
      nom: formData.get('nom') as string,
      email: formData.get('email') as string,
      telephone: (formData.get('telephone') as string) || null,
      message: (formData.get('message') as string) || null,
      profil: (formData.get('profil') as string) || null,
    };

    const { error: dbError } = await supabase
      .from('annonces_contacts')
      .insert(contactData);

    if (dbError) {
      setLoading(false);
      setError('Erreur lors de l\'envoi. Veuillez reessayer.');
      return;
    }

    // Incrementer le compteur de contacts
    await supabase.rpc('increment_annonce_contacts', { p_annonce_id: annonceId });

    setLoading(false);
    setSubmitted(true);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'contact_annonce', {
        event_category: 'conversion',
        event_label: annonceId,
      });
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border-2 border-[var(--color-success)] bg-[var(--color-success)]/5 p-6 text-center">
        <svg className="w-7 h-7 text-[var(--color-success)] mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <p className="text-lg font-semibold text-[var(--color-success)] font-sans">Demande envoyee</p>
        <p className="mt-1 text-sm text-[var(--color-gris)] font-sans">
          Le vendeur recevra votre message et pourra vous contacter.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[var(--color-orange)] bg-white p-6">
      <h3 className="font-sans text-lg font-bold text-[var(--color-marine)] mb-4">
        Contacter le vendeur
      </h3>

      <form onSubmit={handleSubmit} className="grid gap-3">
        {/* Honeypot */}
        <div className="hidden" aria-hidden="true">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="contact-nom" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Nom *
          </label>
          <input
            id="contact-nom"
            name="nom"
            type="text"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Email *
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="contact-tel" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Telephone
          </label>
          <input
            id="contact-tel"
            name="telephone"
            type="tel"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          />
        </div>

        <div>
          <label htmlFor="contact-profil" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Votre profil
          </label>
          <select
            id="contact-profil"
            name="profil"
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20"
          >
            <option value="">Selectionnez</option>
            {PROFILS_CONTACT.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-[var(--color-marine)] mb-1 font-sans">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={4}
            maxLength={1000}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-creme-dark)] px-4 py-3 text-base focus:border-[var(--color-orange)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/20 resize-y"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 font-sans">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-orange)] px-6 py-3 text-lg font-semibold text-white font-sans transition-colors hover:bg-[var(--color-orange-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50 cursor-pointer disabled:opacity-60"
        >
          {loading ? 'Envoi...' : 'Envoyer ma demande'}
        </button>

        <p className="text-xs text-[var(--color-gris)] font-sans text-center">
          LeGuideAuditif ne participe pas aux transactions entre les parties.
        </p>
      </form>
    </div>
  );
};

export default ContactForm;
