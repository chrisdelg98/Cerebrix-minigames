import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { ToastContext, type ToastApi, type ToastOptions, type ToastTone } from './toastContext';

import s from './ToastProvider.module.css';

interface ToastRecord {
  id: number;
  message: string;
  tone: ToastTone;
}

const DEFAULT_DURATION = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone: options?.tone ?? 'neutral' }]);

      timers.current.set(
        id,
        setTimeout(() => {
          dismiss(id);
        }, options?.duration ?? DEFAULT_DURATION)
      );
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* One live region for all of them: announcing each toast's own region
          would make a screen reader re-announce the container every time. */}
      <div className={s.host} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${s.toast} anim-slide-up`} data-tone={toast.tone}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
