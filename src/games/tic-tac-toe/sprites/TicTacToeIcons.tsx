interface SpriteProps {
  size?: number;
}

/** La jugada que gana: tres en diagonal, con el resto del tablero de fondo. */
export function TicTacToeIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3.5v17M15 3.5v17M3.5 9h17M3.5 15h17"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M4.9 4.9 7.1 7.1M7.1 4.9 4.9 7.1M10.9 10.9l2.2 2.2M13.1 10.9l-2.2 2.2M16.9 16.9l2.2 2.2M19.1 16.9l-2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="18" cy="6" r="1.9" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
      <circle cx="6" cy="18" r="1.9" stroke="currentColor" strokeWidth="1.6" opacity="0.55" />
    </svg>
  );
}
