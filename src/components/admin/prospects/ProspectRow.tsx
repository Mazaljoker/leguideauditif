// ProspectRow.tsx — une row liste en vue Liste.
// Jalon 2b : read-only, chevron pointe vers droite.
// Jalon 2c : expansion avec panel d'édition quand isExpanded.

import Badge from '../ui/react/Badge';
import {
  PROSPECT_STATUS_LABELS,
  PROSPECT_SOURCE_LABELS,
  type Prospect,
} from '../../../types/prospect';

interface Props {
  prospect: Prospect;
  isExpanded?: boolean;
  onToggle?: () => void;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const hours = d.getHours();
  const minutes = d.getMinutes();
  if (hours === 0 && minutes === 0) return datePart;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${datePart} ${hh}:${mm}`;
}

function CrownIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-[#D97B3D]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Partenaire Fondateur"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-[#6B7A90] transition-transform ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function ProspectRow({ prospect, isExpanded = false, onToggle }: Props) {
  const companyLine = [prospect.company, [prospect.cp, prospect.city].filter(Boolean).join(' ')]
    .filter((s) => s && s.length > 0)
    .join(' · ');

  const nextActionText = prospect.next_action ?? '—';
  const nextActionDate = formatDateShort(prospect.next_action_at);

  return (
    <div
      onClick={onToggle}
      className={`grid md:grid-cols-[1.8fr_1fr_1fr_1.2fr_40px] grid-cols-[1fr_40px] gap-4 px-5 py-4 items-center border-b border-[#E4DED3] last:border-b-0 cursor-pointer transition-colors font-sans ${
        isExpanded ? 'bg-[#FDFBF7]' : 'hover:bg-[#FDFBF7]'
      }`}
    >
      {/* Colonne 1 : Nom + sub */}
      <div>
        <div className="font-semibold text-[15px] text-[#1B2E4A] flex items-center gap-2">
          <span>{prospect.name}</span>
          {prospect.is_fondateur && <CrownIcon />}
        </div>
        {companyLine && (
          <div className="text-[13px] text-[#6B7A90] mt-0.5">{companyLine}</div>
        )}
        {/* Mobile : métas empilées */}
        <div className="flex flex-wrap gap-2 mt-2 md:hidden">
          <Badge variant={prospect.status}>{PROSPECT_STATUS_LABELS[prospect.status]}</Badge>
          {nextActionText !== '—' && (
            <span className="text-xs text-[#6B7A90]">
              {nextActionText} · {nextActionDate}
            </span>
          )}
        </div>
      </div>

      {/* Colonne 2 : Source — desktop only */}
      <div className="hidden md:block">
        <Badge variant={`source-${prospect.source}` as const}>
          {PROSPECT_SOURCE_LABELS[prospect.source]}
        </Badge>
      </div>

      {/* Colonne 3 : Statut — desktop only */}
      <div className="hidden md:block">
        <Badge variant={prospect.status}>{PROSPECT_STATUS_LABELS[prospect.status]}</Badge>
      </div>

      {/* Colonne 4 : Prochaine action — desktop only */}
      <div className="hidden md:flex flex-col gap-0.5 min-w-0">
        <span className="text-[#1B2E4A] font-medium text-sm truncate">
          {nextActionText}
        </span>
        {nextActionDate && (
          <span className="text-[#6B7A90] text-xs">{nextActionDate}</span>
        )}
      </div>

      {/* Colonne 5 : chevron */}
      <div className="flex justify-end">
        <ChevronIcon expanded={isExpanded} />
      </div>
    </div>
  );
}
