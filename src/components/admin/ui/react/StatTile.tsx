// StatTile.tsx — mirror React de StatTile.astro.
// Card inline (pas de Card.tsx séparé : usage unique ici).

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  variant?: 'default' | 'fondateur';
}

export default function StatTile({ label, value, hint, variant = 'default' }: Props) {
  const cardClasses =
    variant === 'fondateur'
      ? 'rounded-xl border p-4 font-sans border-[#F2D4B3] bg-gradient-to-br from-[#FEF3E8] to-[#FBEEE2]'
      : 'rounded-xl border p-4 font-sans border-[#E4DED3] bg-white';

  const labelColor = variant === 'fondateur' ? 'text-[#D97B3D]' : 'text-[#6B7A90]';
  const valueColor = variant === 'fondateur' ? 'text-[#D97B3D]' : 'text-[#1B2E4A]';

  return (
    <div className={cardClasses}>
      <div
        className={`text-xs uppercase tracking-[0.06em] font-medium mb-1.5 font-sans ${labelColor}`}
      >
        {label}
      </div>
      <div className={`font-serif font-black text-3xl leading-none ${valueColor}`}>{value}</div>
      {hint && <div className="text-xs text-[#6B7A90] mt-1.5 font-sans">{hint}</div>}
    </div>
  );
}
