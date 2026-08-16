import { useEffect, useRef } from 'react';

import s from './Timer.module.css';

export interface TimerProps {
  running: boolean;
  /** Time already accumulated before this run — a resumed session. */
  elapsedMs?: number;
}

/**
 * The tick lives outside React: a rAF loop writes textContent directly and only
 * when the rendered string actually changes. A setState per tick would
 * re-render the whole board once a second for a cosmetic digit.
 * Reference: docs/DESIGN_SYSTEM.md §9.
 */
export function Timer({ running, elapsedMs = 0 }: TimerProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let frame = 0;
    let painted = '';
    /*
     * Anchored on the FIRST rAF timestamp, never on performance.now(). The two
     * are not guaranteed to share a time origin — browsers happen to line them
     * up, jsdom does not, and mixing them made a resumed clock read BELOW the
     * time it resumed from. One clock, one origin.
     */
    let startedAt: number | null = null;

    const show = (total: number) => {
      const next = formatDuration(total);
      if (next !== painted) {
        painted = next;
        node.textContent = next;
      }
    };

    show(elapsedMs);
    if (!running) return;

    const tick = (now: number) => {
      startedAt ??= now;
      show(elapsedMs + (now - startedAt));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, elapsedMs]);

  return (
    <span className={`${s.timer} tabular`} role="timer" aria-live="off">
      <span ref={ref} />
    </span>
  );
}

/** mm:ss, growing to h:mm:ss only when it has to. */
function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}
