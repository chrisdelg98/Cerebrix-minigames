import { useEffect, useRef } from 'react';

export interface AutosaveOptions {
  /** Runs on the trailing edge of the debounce, and immediately on a flush. */
  save: () => void;
  /** Nothing is scheduled while this is false. */
  enabled: boolean;
  /** A change here schedules a save. Usually the game state itself. */
  trigger: unknown;
  delayMs?: number;
}

/**
 * Debounced autosave with a guaranteed flush before the page goes away.
 *
 * Debounce alone loses the last moves: on mobile the system kills the tab
 * without warning and a pending 400ms timer never fires. `visibilitychange` is
 * the only event that reliably arrives — `beforeunload` does not fire on mobile
 * at all, and `pagehide` covers the bfcache case desktop Safari uses.
 *
 * Reference: docs/PLAN.md, change #4.
 */
export function useAutosave({ save, enabled, trigger, delayMs = 400 }: AutosaveOptions): void {
  // Kept in refs so changing the callback does not reschedule the timer: the
  // save closure changes on every move, which is exactly what we debounce.
  // Written in an effect, never during render — a ref mutated while rendering
  // is torn during a re-entrant render and React flags it.
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    saveRef.current = save;
    enabledRef.current = enabled;
  });

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    timer.current = setTimeout(() => {
      timer.current = null;
      saveRef.current();
    }, delayMs);

    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [trigger, enabled, delayMs]);

  useEffect(() => {
    const flush = () => {
      if (!enabledRef.current) return;
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
      saveRef.current();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);
}
