import { useCallback, useRef } from 'react';

/**
 * Fires a game's `import()` on hover (desktop) or pointerdown (touch), so the
 * chunk is usually already there by the time the finger lifts.
 *
 * Reference: docs/DESIGN_SYSTEM.md §8.
 */
export function usePrefetch(): (load: () => Promise<unknown>) => void {
  const started = useRef(new WeakSet<() => Promise<unknown>>());

  return useCallback((load: () => Promise<unknown>) => {
    if (started.current.has(load)) return;
    started.current.add(load);
    // A failed prefetch is not a user-facing failure: the real navigation will
    // retry and surface the error there.
    void load().catch(() => undefined);
  }, []);
}
