// ProspectsHeader.tsx — remplace ProspectsHeader.astro en Jalon 2c.
// Bouton "+ Nouveau prospect" désormais interactif.

import Button from '../ui/react/Button';

interface Props {
  onNewClick: () => void;
}

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function ProspectsHeader({ onNewClick }: Props) {
  return (
    <div className="flex items-end justify-between gap-5 mb-6 flex-wrap">
      <div>
        <h1 className="font-serif text-3xl font-black text-[#1B2E4A] mb-1">Prospects</h1>
        <p className="text-sm text-[#6B7A90] font-sans">
          Pipeline commercial — mis à jour en direct depuis Supabase
        </p>
      </div>
      <Button variant="primary" onClick={onNewClick}>
        <PlusIcon />
        Nouveau prospect
      </Button>
    </div>
  );
}
