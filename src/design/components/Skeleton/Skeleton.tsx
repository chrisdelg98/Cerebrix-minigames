import { type CSSVars } from '../../types';

import s from './Skeleton.module.css';

export interface SkeletonProps {
  /** Any CSS inline size. Defaults to filling the container. */
  w?: string;
  h?: string;
  radius?: string;
  /** Announced to screen readers while content is on its way. */
  label?: string;
}

/**
 * Shimmer, never a spinner: a placeholder shaped like the thing that is coming
 * keeps the layout from jumping when it arrives.
 * Reference: docs/DESIGN_SYSTEM.md §5.4.
 */
export function Skeleton({
  w = '100%',
  h = 'var(--sp-6)',
  radius = 'var(--r-md)',
  label,
}: SkeletonProps) {
  return (
    <span
      className={s.skeleton}
      style={{ '--skeleton-w': w, '--skeleton-h': h, '--skeleton-radius': radius } as CSSVars}
      aria-hidden={label === undefined ? true : undefined}
      role={label === undefined ? undefined : 'status'}
      aria-label={label}
    >
      <span className={`${s.sheen} anim-shimmer`} />
    </span>
  );
}
