import { useEffect, useRef, type ReactNode } from 'react';

import { prefersReducedMotion } from '../../preferences';

import s from './StatTile.module.css';

export interface StatTileProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  /** Formats the animated number. Defaults to the integer itself. */
  format?: (value: number) => string;
  trend?: 'up' | 'down';
  /**
   * Algo dibujado dentro de la ficha, detrás del número.
   *
   * Va acá adentro y no envuelto por fuera para que lo recorte el
   * `overflow: hidden` de la ficha y le herede las esquinas: lo que se ponga no
   * puede desbordarse ni tapar lo de al lado. `<StatTile>` no sabe qué es.
   */
  overlay?: ReactNode;
}

/** docs/DESIGN_SYSTEM.md §5.3 — count-up runs for 700ms on an ease-out curve. */
const COUNT_UP_MS = 700;

export function StatTile({ label, value, icon, format, trend, overlay }: StatTileProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const numeric = typeof value === 'number' ? value : null;

  useEffect(() => {
    const node = ref.current;
    if (!node || numeric === null) return;

    const render = format ?? ((n: number) => String(Math.round(n)));

    // The end state must be correct even when the animation never runs.
    if (prefersReducedMotion()) {
      node.textContent = render(numeric);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / COUNT_UP_MS);
      // Same ease-out shape as --e-out, so it matches everything else on screen.
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = render(numeric * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [numeric, format]);

  return (
    <div className={s.tile}>
      {overlay}

      {/* Behind the numbers, not beside them: it gives the card an identity
          without spending a row on it. */}
      {icon !== undefined && (
        <span className={s.icon} aria-hidden="true">
          {icon}
        </span>
      )}

      <span className={s.value}>
        {numeric === null ? value : <span ref={ref} className="tabular" />}
        {trend !== undefined && (
          <span className={s.trend} data-trend={trend} aria-hidden="true">
            {trend === 'up' ? '▲' : '▼'}
          </span>
        )}
      </span>

      <span className={s.label}>{label}</span>
    </div>
  );
}
