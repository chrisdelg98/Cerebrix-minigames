interface SpriteProps {
  size?: number;
}

/**
 * The card icon: sun up in one corner, moon down in the other.
 *
 * Grandes y casi tocándose en la diagonal: separados de más el icono se veía
 * vacío al lado de los otros, y superpuestos eran una mancha. Que los dos
 * símbolos nunca se confundan es de lo que trata el juego, así que se tocan sin
 * pisarse.
 */
export function TangoIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="7.6" cy="7.6" r="5.3" fill="currentColor" />
      <g transform="translate(7.4 7.4) scale(0.73)" opacity="0.7">
        <path d="M20.5 15.2A8.6 8.6 0 0 1 9.3 4a8.6 8.6 0 1 0 11.2 11.2z" fill="currentColor" />
      </g>
    </svg>
  );
}

export function SunGlyph({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="currentColor" />
    </svg>
  );
}

export function MoonGlyph({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 15.2A8.6 8.6 0 0 1 9.3 4a8.6 8.6 0 1 0 11.2 11.2z" fill="currentColor" />
    </svg>
  );
}
