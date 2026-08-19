interface SpriteProps {
  size?: number;
}

/** Una encendida entre apagadas, y su cruz de vecinas: el juego en un icono. */
export function ApagonIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
      <circle cx="12" cy="4.4" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="12" cy="19.6" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="4.4" cy="12" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="19.6" cy="12" r="2.4" fill="currentColor" opacity="0.55" />
      <circle cx="4.4" cy="4.4" r="1.6" fill="currentColor" opacity="0.2" />
      <circle cx="19.6" cy="4.4" r="1.6" fill="currentColor" opacity="0.2" />
      <circle cx="4.4" cy="19.6" r="1.6" fill="currentColor" opacity="0.2" />
      <circle cx="19.6" cy="19.6" r="1.6" fill="currentColor" opacity="0.2" />
    </svg>
  );
}
