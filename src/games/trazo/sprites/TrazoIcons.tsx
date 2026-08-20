interface SpriteProps {
  size?: number;
}

/** El icono de la tarjeta: un trazo que dobla y no se corta. */
/**
 * Un camino que VISITA puntos, no una línea suelta.
 *
 * El juego es pasar por los números en orden, y el icono anterior solo mostraba
 * una manguera doblada: no decía nada del juego y encima se confundía con el de
 * Snake. Los tres discos sobre el recorrido son la regla entera en una figura.
 */
export function TrazoIcon({ size = 24 }: SpriteProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Ortogonal, como se traza en el tablero. */}
      <path d="M5 19v-7h7V5h7" />
      <circle cx="5" cy="19" r="2.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" opacity="0.6" />
      <circle cx="19" cy="5" r="2.7" fill="currentColor" stroke="none" />
    </svg>
  );
}
