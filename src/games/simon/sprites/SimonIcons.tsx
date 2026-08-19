interface SpriteProps {
  size?: number;
}

/** Cuatro pastillas, una encendida: el juego entero en un icono. */
export function SimonIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="8.4" height="8.4" rx="2" fill="currentColor" />
      <rect x="12.6" y="3" width="8.4" height="8.4" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="3" y="12.6" width="8.4" height="8.4" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="12.6" y="12.6" width="8.4" height="8.4" rx="2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
