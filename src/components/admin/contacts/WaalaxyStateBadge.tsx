// WaalaxyStateBadge.tsx — badge coloré pour l'état Waalaxy d'un contact.

import { WAALAXY_STATE_LABELS, type WaalaxyState } from '../../../types/prospect';

interface Props {
  state: WaalaxyState | null;
}

const styles: Record<WaalaxyState, { bg: string; text: string; dot: string }> = {
  interested: { bg: 'bg-[#E3F0EA]', text: 'text-[#2F7A5A]', dot: 'bg-[#2F7A5A]' },
  replied: { bg: 'bg-[#FBEFD8]', text: 'text-[#B8761F]', dot: 'bg-[#B8761F]' },
  later_interested: { bg: 'bg-[#E1EAF4]', text: 'text-[#1E4B7A]', dot: 'bg-[#1E4B7A]' },
  not_interested: { bg: 'bg-[#F6E3E3]', text: 'text-[#B34444]', dot: 'bg-[#B34444]' },
  connected: { bg: 'bg-[#E8ECF2]', text: 'text-[#1B2E4A]', dot: 'bg-[#6B7A90]' },
};

export default function WaalaxyStateBadge({ state }: Props) {
  if (!state) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold bg-[#F5F3ED] text-[#6B7A90]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6B7A90]" aria-hidden="true" />
        Sans statut
      </span>
    );
  }
  const s = styles[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {WAALAXY_STATE_LABELS[state]}
    </span>
  );
}
