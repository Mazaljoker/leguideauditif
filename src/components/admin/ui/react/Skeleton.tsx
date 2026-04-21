// Skeleton.tsx — placeholder animé pendant les fetchs.

interface Props {
  className?: string;
}

export default function Skeleton({ className = '' }: Props) {
  return (
    <div
      className={`animate-pulse bg-[#E8ECF2] rounded ${className}`}
      aria-hidden="true"
    />
  );
}
