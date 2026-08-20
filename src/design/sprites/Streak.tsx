import s from './Streak.module.css';

export interface StreakProps {
  size?: number;
  /** The flame only flickers while the streak is alive. */
  count?: number;
}

export function Streak({ size = 24, count = 0 }: StreakProps) {
  return (
    <svg
      className={`${s.flame} ${count > 0 ? 'anim-pulse-soft' : ''}`}
      data-alive={count > 0}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* La silueta. */}
      <path
        d="M12.6 1.6c.5 3.3 2.4 5 4 6.9 1.7 2 2.8 3.9 2.8 6.4a7.4 7.4 0 0 1-14.8 0c0-2.2 1-4.1 2.4-5.7.1 1.3.7 2.4 1.7 3.1.1-4 1.6-7.6 3.9-10.7z"
        opacity="0.5"
      />
      {/* El corazón, más brillante: es lo que la hace leer como fuego y no como
          una gota. Un contorno abierto a 64px se veía como un alambre. */}
      <path d="M12.2 11.9c1.5 1.9 2.9 3.2 2.9 5a3 3 0 0 1-6 0c0-1.8 1.5-3.1 3.1-5z" />
    </svg>
  );
}
