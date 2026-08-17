interface SpriteProps {
  size?: number;
}

const crown = 'M4 8.5l3.6 3L12 5l4.4 6.5 3.6-3-1.6 8.5H5.6z';

/** The card icon: a crown standing on its board. */
export function QueensIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={crown} fill="currentColor" />
      <rect x="4.6" y="18.4" width="14.8" height="2.4" rx="0.8" fill="currentColor" />
    </svg>
  );
}

/**
 * Sin `width`: la corona la dimensiona el CSS de la vista contra la celda.
 *
 * Un tamaño en píxeles se ve bien en un tablero y ridículo en el otro — en 4×4
 * la casilla es del doble que en 8×8, y la misma corona quedaba perdida en el
 * medio.
 */
export function CrownGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={crown} fill="currentColor" />
      <rect x="4.6" y="18.4" width="14.8" height="2.4" rx="0.8" fill="currentColor" />
    </svg>
  );
}
