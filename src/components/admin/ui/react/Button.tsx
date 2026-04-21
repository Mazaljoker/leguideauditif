// Button.tsx — mirror React de Button.astro.
// Même API, mêmes classes, touch targets accessibilité seniors.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'save' | 'cancel' | 'icon';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant: Variant;
  className?: string;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-sans font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#D97B3D] text-white hover:bg-[#c46a2e] px-4 py-2.5 text-sm',
  ghost: 'bg-transparent text-[#1B2E4A] border border-[#E4DED3] hover:bg-[#E8ECF2] px-4 py-2.5 text-sm',
  save: 'bg-[#1B2E4A] text-white hover:bg-[#2a4268] px-3.5 py-2 text-[13px]',
  cancel: 'bg-transparent text-[#6B7A90] hover:text-[#1B2E4A] px-3 py-2 text-[13px]',
  icon: 'bg-transparent text-[#6B7A90] hover:text-[#1B2E4A] p-2 rounded-lg',
};

export default function Button({
  variant,
  className = '',
  children,
  type = 'button',
  ...rest
}: Props) {
  const size =
    variant === 'icon'
      ? { minHeight: 40, minWidth: 40 }
      : { minHeight: 44 };
  const cls = `${base} ${variantClasses[variant]} ${className}`.trim();

  return (
    <button type={type} className={cls} style={size} {...rest}>
      {children}
    </button>
  );
}
