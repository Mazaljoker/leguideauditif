// ContactRow.tsx — une ligne du tableau contacts.
// Actions : convertir en prospect (si pas déjà converti), archiver.

import { useState } from 'react';
import WaalaxyStateBadge from './WaalaxyStateBadge';
import type { Contact } from '../../../types/prospect';

interface Props {
  contact: Contact;
  onConvert: (contactId: string) => Promise<void>;
  onArchive: (contactId: string) => Promise<void>;
}

function LinkedinIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ContactRow({ contact, onConvert, onArchive }: Props) {
  const [busy, setBusy] = useState<'convert' | 'archive' | null>(null);

  const company = [contact.company_name, contact.location]
    .filter((s) => s && s.length > 0)
    .join(' · ');

  async function handleConvert(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy || contact.converted_to_prospect_id) return;
    setBusy('convert');
    try {
      await onConvert(contact.id);
    } finally {
      setBusy(null);
    }
  }

  async function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    if (!confirm('Archiver ce contact ?')) return;
    setBusy('archive');
    try {
      await onArchive(contact.id);
    } finally {
      setBusy(null);
    }
  }

  const isConverted = !!contact.converted_to_prospect_id;

  return (
    <div className="grid md:grid-cols-[2fr_1.4fr_1fr_1fr_120px] grid-cols-[1fr_auto] gap-4 px-5 py-4 items-center border-b border-[#E4DED3] last:border-b-0 font-sans hover:bg-[#FDFBF7] transition-colors">
      {/* Col 1 : identité + job */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px] text-[#1B2E4A] truncate">
            {contact.first_name} {contact.last_name}
          </span>
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[#0A66C2] hover:text-[#084d94] shrink-0"
              aria-label="Voir le profil LinkedIn"
            >
              <LinkedinIcon />
            </a>
          )}
        </div>
        {contact.job_title && (
          <div className="text-[13px] text-[#6B7A90] mt-0.5 truncate">{contact.job_title}</div>
        )}
        {/* Mobile : métas empilées */}
        <div className="flex flex-wrap gap-2 mt-2 md:hidden items-center">
          <WaalaxyStateBadge state={contact.waalaxy_state} />
          {isConverted && (
            <span className="inline-flex items-center gap-1 text-xs text-[#2F7A5A] font-semibold">
              <CheckIcon />
              Converti
            </span>
          )}
        </div>
      </div>

      {/* Col 2 : entreprise + location — desktop */}
      <div className="hidden md:block min-w-0">
        <div className="text-sm text-[#1B2E4A] truncate">{company || '—'}</div>
        {contact.waalaxy_last_reply_content && (
          <div className="text-xs text-[#6B7A90] italic mt-0.5 truncate" title={contact.waalaxy_last_reply_content}>
            « {contact.waalaxy_last_reply_content} »
          </div>
        )}
      </div>

      {/* Col 3 : état Waalaxy — desktop */}
      <div className="hidden md:block">
        <WaalaxyStateBadge state={contact.waalaxy_state} />
      </div>

      {/* Col 4 : converti ? — desktop */}
      <div className="hidden md:flex items-center gap-1 text-xs">
        {isConverted ? (
          <span className="inline-flex items-center gap-1 text-[#2F7A5A] font-semibold">
            <CheckIcon />
            Lié prospect
          </span>
        ) : (
          <span className="text-[#6B7A90]">Pas converti</span>
        )}
      </div>

      {/* Col 5 : actions */}
      <div className="flex items-center justify-end gap-1">
        {!isConverted && (
          <button
            type="button"
            onClick={handleConvert}
            disabled={busy !== null}
            className="p-2 rounded-lg text-[#6B7A90] hover:text-[#D97B3D] hover:bg-[#FBEEE2] disabled:opacity-50"
            aria-label="Convertir en prospect"
            title="Convertir en prospect"
            style={{ minHeight: 40, minWidth: 40 }}
          >
            <UserPlusIcon />
          </button>
        )}
        <button
          type="button"
          onClick={handleArchive}
          disabled={busy !== null}
          className="p-2 rounded-lg text-[#6B7A90] hover:text-[#B34444] hover:bg-[#F6E3E3] disabled:opacity-50"
          aria-label="Archiver"
          title="Archiver"
          style={{ minHeight: 40, minWidth: 40 }}
        >
          <ArchiveIcon />
        </button>
      </div>
    </div>
  );
}
