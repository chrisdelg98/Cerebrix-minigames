import { createContext, useContext } from 'react';

export type ToastTone = 'neutral' | 'success' | 'danger' | 'info';

export interface ToastOptions {
  tone?: ToastTone;
  /** Milliseconds on screen. */
  duration?: number;
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void;
}

/**
 * Split from the provider so the component file exports only components —
 * mixing the two breaks React Fast Refresh for the whole module.
 */
export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
