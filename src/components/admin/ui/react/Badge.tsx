// Badge.tsx — mirror React de Badge.astro.
// Même API, mêmes classes Tailwind. Utilisé dans les composants React
// qui ne peuvent pas importer de .astro (ProspectRow, PipelineCard...).

import type { ReactNode } from 'react';

type BadgeVariant =
  | 'prospect' | 'contacte' | 'rdv' | 'proposition' | 'signe' | 'perdu'
  | 'source-linkedin' | 'source-rpps' | 'source-entrant' | 'source-autre'
  | 'fondateur';

interface Props {
  variant: BadgeVariant;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; dot: string | null }> = {
  prospect: { bg: 'bg-[#E8ECF2]', text: 'text-[#1B2E4A]', dot: 'bg-[#6B7A90]' },
  contacte: { bg: 'bg-[#E1EAF4]', text: 'text-[#1E4B7A]', dot: 'bg-[#1E4B7A]' },
  rdv: { bg: 'bg-[#FBEFD8]', text: 'text-[#B8761F]', dot: 'bg-[#B8761F]' },
  proposition: { bg: 'bg-[#EAE6F0]', text: 'text-[#5B4B7A]', dot: 'bg-[#5B4B7A]' },
  signe: { bg: 'bg-[#E3F0EA]', text: 'text-[#2F7A5A]', dot: 'bg-[#2F7A5A]' },
  perdu: { bg: 'bg-[#F6E3E3]', text: 'text-[#B34444]', dot: 'bg-[#B34444]' },
  'source-linkedin': { bg: 'bg-transparent', text: 'text-[#6B7A90]', dot: 'bg-[#0A66C2]' },
  'source-rpps': { bg: 'bg-transparent', text: 'text-[#6B7A90]', dot: 'bg-[#1B2E4A]' },
  'source-entrant': { bg: 'bg-transparent', text: 'text-[#6B7A90]', dot: 'bg-[#D97B3D]' },
  'source-autre': { bg: 'bg-transparent', text: 'text-[#6B7A90]', dot: 'bg-[#6B7A90]' },
  fondateur: { bg: 'bg-[#FBEEE2]', text: 'text-[#D97B3D]', dot: null },
};

export default function Badge({ variant, className = '', children }: Props) {
  const styles = variantStyles[variant];
  const isFondateur = variant === 'fondateur';

  const base =
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-sans font-semibold';
  const cls = `${base} ${styles.bg} ${styles.text} ${className}`.trim();

  return (
    <span className={cls}>
      {isFondateur && (
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
          <path d="M5 21h14" />
        </svg>
      )}
      {styles.dot && (
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
