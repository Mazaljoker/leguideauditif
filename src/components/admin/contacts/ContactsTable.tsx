// ContactsTable.tsx — table list des contacts.

import ContactRow from './ContactRow';
import type { Contact } from '../../../types/prospect';

interface Props {
  contacts: Contact[];
  onConvert: (contactId: string) => Promise<void>;
  onArchive: (contactId: string) => Promise<void>;
}

export default function ContactsTable({ contacts, onConvert, onArchive }: Props) {
  if (contacts.length === 0) {
    return (
      <div className="bg-white border border-[#E4DED3] rounded-xl py-16 text-center">
        <svg
          className="w-10 h-10 mx-auto mb-3 text-[#E4DED3]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="text-sm text-[#6B7A90] font-sans italic">
          Aucun contact. Importe un CSV Waalaxy pour commencer.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E4DED3] rounded-xl overflow-hidden">
      {/* Header desktop only */}
      <div className="hidden md:grid grid-cols-[2fr_1.4fr_1fr_1fr_120px] gap-4 px-5 py-3 border-b border-[#E4DED3] bg-[#FDFBF7] text-[11px] font-semibold text-[#6B7A90] uppercase tracking-[0.06em] font-sans">
        <div>Contact</div>
        <div>Entreprise / Localisation</div>
        <div>État Waalaxy</div>
        <div>Prospect</div>
        <div className="text-right">Actions</div>
      </div>

      {contacts.map((c) => (
        <ContactRow
          key={c.id}
          contact={c}
          onConvert={onConvert}
          onArchive={onArchive}
        />
      ))}
    </div>
  );
}
