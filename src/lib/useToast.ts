// useToast — hook minimaliste pour toasts. Un seul toast à la fois.

import { useCallback, useState } from 'react';

export type ToastVariant = 'error' | 'success' | 'info';

export interface ToastState {
  message: string;
  variant: ToastVariant;
  action?: { label: string; onClick: () => void };
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', action?: ToastState['action']) => {
      setToast({ message, variant, action });
    },
    []
  );

  const hideToast = useCallback(() => setToast(null), []);

  return { toast, showToast, hideToast };
}
