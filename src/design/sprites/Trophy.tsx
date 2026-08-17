import s from './Trophy.module.css';

export interface TrophyProps {
  size?: number;
  /** `unlocked` plays the pop-in and the shine sweep once. */
  state?: 'idle' | 'unlocked';
}

export function Trophy({ size = 24, state = 'idle' }: TrophyProps) {
  return (
    <span
      className={`${s.wrap} ${state === 'unlocked' ? 'anim-trophy-win' : ''}`}
      data-state={state}
    >
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
        <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
        <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        <path d="M9 20h6M12 14v6" />
      </svg>
      {state === 'unlocked' && <span className={`${s.shine} anim-shimmer`} />}
    </span>
  );
}
