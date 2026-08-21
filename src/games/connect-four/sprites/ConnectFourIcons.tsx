interface SpriteProps {
  size?: number;
}

/** Una diagonal de cuatro cayendo en el tablero: la jugada que gana. */
export function ConnectFourIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.45"
      />
      <circle cx="7" cy="10" r="1.7" fill="currentColor" />
      <circle cx="11.7" cy="13" r="1.7" fill="currentColor" />
      <circle cx="16.4" cy="16" r="1.7" fill="currentColor" />
      <circle cx="7" cy="17" r="1.7" fill="currentColor" opacity="0.3" />
      <circle cx="11.7" cy="17" r="1.7" fill="currentColor" opacity="0.3" />
      <circle cx="16.4" cy="10" r="1.7" fill="currentColor" opacity="0.3" />
      {/* La que está por caer, arriba del tablero. */}
      <circle cx="16.4" cy="2.6" r="1.7" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
