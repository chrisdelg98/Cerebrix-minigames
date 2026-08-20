interface SpriteProps {
  size?: number;
}

/**
 * Dos fichas iguales de un lado, una del doble de grande del otro.
 *
 * Lo que distingue a este icono de los de Secuencia y Memoria es que sus cuadrados
 * NO son todos del mismo tamaño — y ese contraste es justo la mecánica: dos
 * iguales entran y sale una que vale el doble. Un intento anterior superponía
 * las chicas a la grande y parecía un carrete con orejas.
 */
export function Game2048Icon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="8" height="8" rx="2.2" fill="currentColor" opacity="0.38" />
      <rect x="1.5" y="13.5" width="8" height="8" rx="2.2" fill="currentColor" opacity="0.38" />
      <rect x="12.5" y="6.5" width="11" height="11" rx="3" fill="currentColor" />
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
