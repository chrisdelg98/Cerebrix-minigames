import s from './MinesweeperIcons.module.css';

export interface SpriteProps {
  size?: number;
}

const base = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: 'false',
} as const;

/** Rides in the initial bundle: the registry imports it eagerly for Home. */
export function MinesweeperIcon({ size = 24 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      {...base}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
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
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
      </g>
      <circle className={s.core} cx="12" cy="12" r="4.6" fill="currentColor" />
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
