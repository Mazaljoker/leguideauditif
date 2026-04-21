// Chip.tsx — mirror React de Chip.astro.
// Phase 4 branchera l'onClick pour filtrer. Ici, onClick optionnel.

interface Props {
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Chip({ label, count, active = false, onClick, className = '' }: Props) {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-sans font-medium border transition-colors';
  const state = active
    ? 'bg-[#1B2E4A] text-white border-[#1B2E4A]'
    : 'bg-transparent text-[#1B2E4A] border-[#E4DED3] hover:bg-[#E8ECF2]';
  const cursor = onClick ? 'cursor-pointer' : 'cursor-default';
  const cls = `${base} ${state} ${cursor} ${className}`.trim();
  const countBg = active ? 'bg-white/20' : 'bg-black/10';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cls}
      style={{ minHeight: 36 }}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${countBg}`}>
          {count}
        </span>
      )}
    </button>
  );
}
