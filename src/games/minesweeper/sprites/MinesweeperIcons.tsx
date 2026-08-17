import s from './MinesweeperIcons.module.css';

export interface SpriteProps {
  size?: number;
}

const base = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: 'false',
} as const;

/**
 * Rides in the initial bundle: the registry imports it eagerly for Home.
 *
 * A fat body with stubby spikes, not a small core with long rays — that is the
 * whole difference between the classic mine and a sun, and the previous version
 * landed on the wrong side of it. The highlight is the last touch that makes it
 * read as a sphere.
 */
export function MinesweeperIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} {...base} fill="none">
      <g stroke="currentColor" strokeWidth="2.1" strokeLinecap="butt">
        <path d="M12 1.5v3.2M12 19.3v3.2M1.5 12h3.2M19.3 12h3.2" />
        <path d="M4.6 4.6l2.3 2.3M17.1 17.1l2.3 2.3M19.4 4.6l-2.3 2.3M6.9 17.1l-2.3 2.3" />
      </g>
      <circle cx="12" cy="12" r="7.2" fill="currentColor" />
      <circle cx="9.4" cy="9.4" r="1.7" fill="var(--c-surface)" />
    </svg>
  );
}

export function Mine({
  size = 20,
  state = 'revealed',
}: SpriteProps & { state?: 'revealed' | 'exploded' }) {
  return (
    <svg className={s.mine} data-state={state} width={size} height={size} {...base}>
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.2 2.2M16.8 16.8l2.2 2.2M19 5l-2.2 2.2M7.2 16.8L5 19" />
      </g>
      <circle className={s.core} cx="12" cy="12" r="7" fill="currentColor" />
      <circle cx="9.5" cy="9.5" r="1.6" fill="var(--c-surface)" />
    </svg>
  );
}

export function Flag({ size = 20 }: SpriteProps) {
  return (
    <svg className={s.flag} width={size} height={size} {...base}>
      {/* The pole is fixed and the cloth waves — a flag that moves as one piece
          reads as a sticker. */}
      <path d="M7 3v18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path className={s.cloth} d="M7 4h10l-2.5 3.5L17 11H7z" fill="currentColor" />
    </svg>
  );
}
