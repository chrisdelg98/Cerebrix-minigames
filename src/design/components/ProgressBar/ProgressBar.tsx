import { type CSSVars } from '../../types';

import s from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0 to 1. */
  value: number;
  label: string;
}

/**
 * Driven by scaleX, never by width: animating width relayouts the whole
 * subtree on every frame. Reference: docs/DESIGN_SYSTEM.md §5.2.
 */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div
      className={s.track}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <div className={s.fill} style={{ '--progress': clamped } as CSSVars} />
    </div>
  );
}
