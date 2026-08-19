interface SpriteProps {
  size?: number;
}

/**
 * Dos fichas chicas empujadas contra una grande: la fusión, que es el juego.
 *
 * La opacidad hace de escala — cuanto más vale la ficha, más presencia tiene —
 * que es exactamente lo que hace el tablero.
 */
export function Game2048Icon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8.4" height="8.4" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="12.6" y="3" width="8.4" height="8.4" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="3" y="12.6" width="18" height="8.4" rx="2" fill="currentColor" />
    </svg>
  );
}

/** La flecha que dibuja los ejemplos de "cómo se juega". */
export function SwipeIcon({ size = 24 }: SpriteProps) {
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
    >
      <path d="M4 12h14" />
      <path d="M13 7l5 5-5 5" />
    </svg>
  );
}
