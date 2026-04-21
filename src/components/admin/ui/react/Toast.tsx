// Toast.tsx — toast inline minimaliste (pas de lib).
// Auto-close 4s par défaut, positionné bottom-right, z-60.

import { useEffect } from 'react';

type ToastVariant = 'error' | 'success' | 'info';

interface Props {
  message: string;
  variant: ToastVariant;
  onClose: () => void;
  autoCloseMs?: number;
  action?: { label: string; onClick: () => void };
}

const BG: Record<ToastVariant, string> = {
  error: 'bg-[#B34444]',
  success: 'bg-[#2F7A5A]',
  info: 'bg-[#1B2E4A]',
};

export default function Toast({
  message,
  variant,
  onClose,
  autoCloseMs = 4000,
  action,
}: Props) {
  useEffect(() => {
    if (autoCloseMs <= 0) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [onClose, autoCloseMs]);

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm font-sans" role="status">
      <div
        className={`${BG[variant]} text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3`}
      >
        <span className="text-sm flex-1">{message}</span>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm font-semibold underline underline-offset-2 hover:opacity-80 whitespace-nowrap"
          >
            {action.label}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white"
          aria-label="Fermer le message"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
