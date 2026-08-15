import s from './Streak.module.css';

export interface StreakProps {
  size?: number;
  /** The flame only flickers while the streak is alive. */
  count?: number;
}

export function Streak({ size = 24, count = 0 }: StreakProps) {
  return (
    <svg
      className={s.flame}
      data-alive={count > 0}
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
      <path d="M12 3c.6 3.2 3.2 4.3 3.2 7.2a3.2 3.2 0 0 1-6.4 0c0-1 .4-1.8 1-2.5" />
      <path d="M12 21a6 6 0 0 1-6-6c0-3.4 2.4-5.2 3.6-8.2" />
      <path d="M12 21a6 6 0 0 0 6-6c0-1.6-.6-2.9-1.4-4.1" />
    </svg>
  );
}
