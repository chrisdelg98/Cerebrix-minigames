interface SpriteProps {
  size?: number;
}

/** Tres pisos que se van angostando, y uno todavía en el aire. */
export function StackIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* El que se está por apoyar, corrido: es la decisión del juego. */}
      <rect
        x="7"
        y="2.5"
        width="11"
        height="4"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.65"
      />

      <rect x="4" y="8.5" width="13" height="4" rx="1.2" fill="currentColor" opacity="0.45" />
      <rect x="5.5" y="13.5" width="13" height="4" rx="1.2" fill="currentColor" opacity="0.7" />
      <rect x="4" y="18.5" width="16" height="4" rx="1.2" fill="currentColor" />
    </svg>
  );
}
