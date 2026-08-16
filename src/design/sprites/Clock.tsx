import s from './Clock.module.css';

export interface ClockProps {
  size?: number;
  running?: boolean;
}

export function Clock({ size = 24, running = false }: ClockProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5" />
      {/* The second hand ticks in steps(60) — it jumps, it does not glide. */}
      <path className={`${s.hand} ${running ? 'anim-clock-hand' : ''}`} d="M12 12h3.5" />
    </svg>
  );
}
