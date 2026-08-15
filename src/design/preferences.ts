import { useCallback, useEffect, useState } from 'react';

/**
 * The two preferences that change how the whole app looks and moves.
 *
 * Both are written onto <html> as data attributes and mirrored to
 * localStorage under the SAME keys the anti-FOUC script in index.html reads.
 * That script runs before React and before first paint — if these keys ever
 * drift apart, the page flashes the wrong theme on every load.
 *
 * Reference: docs/DESIGN_SYSTEM.md §2.3 and §5.5
 */

export const THEME_KEY = 'cerebrix:theme';
export const MOTION_KEY = 'cerebrix:motion';

export type Theme = 'dark' | 'light';
export type Motion = 'full' | 'reduced';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private mode, disabled storage: the preference just does not persist.
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not persisting is survivable; not rendering is not */
  }
}

export function useTheme(): [Theme, (next: Theme) => void] {
  // The pre-paint script already resolved stored preference vs. OS setting and
  // stamped <html>. Reading it back keeps React and the DOM in agreement.
  const [theme, setThemeState] = useState<Theme>(
    () => (document.documentElement.dataset['theme'] as Theme | undefined) ?? 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    write(THEME_KEY, next);
  }, []);

  return [theme, setTheme];
}

export function useMotion(): [Motion, (next: Motion) => void] {
  const [motion, setMotionState] = useState<Motion>(() =>
    readStored(MOTION_KEY) === 'reduced' ? 'reduced' : 'full'
  );

  useEffect(() => {
    if (motion === 'reduced') {
      document.documentElement.dataset['motion'] = 'reduced';
    } else {
      delete document.documentElement.dataset['motion'];
    }
  }, [motion]);

  const setMotion = useCallback((next: Motion) => {
    setMotionState(next);
    write(MOTION_KEY, next);
  }, []);

  return [motion, setMotion];
}

/**
 * True when motion should be suppressed, from either channel: the OS setting or
 * the in-app toggle. CSS handles this on its own; this is for the JS-driven
 * animations (count-up, canvas celebrations) that CSS cannot reach.
 */
export function prefersReducedMotion(): boolean {
  if (document.documentElement.dataset['motion'] === 'reduced') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
