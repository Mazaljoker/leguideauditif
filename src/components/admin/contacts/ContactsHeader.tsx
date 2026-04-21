// ContactsHeader.tsx — header de la page /admin/contacts.

import Button from '../ui/react/Button';

interface Props {
  total: number;
  onImportClick: () => void;
}

function UploadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

export default function ContactsHeader({ total, onImportClick }: Props) {
  return (
    <div className="flex items-end justify-between gap-5 mb-6 flex-wrap">
      <div>
        <h1 className="font-serif text-3xl font-black text-[#1B2E4A] mb-1">Contacts</h1>
        <p className="text-sm text-[#6B7A90] font-sans">
          {total} contact{total > 1 ? 's' : ''} — pool importé (Waalaxy, LinkedIn, manuel).
        </p>
      </div>
      <Button variant="primary" onClick={onImportClick}>
        <UploadIcon />
        Importer CSV
      </Button>
    </div>
  );
}
