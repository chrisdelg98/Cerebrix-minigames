interface SpriteProps {
  size?: number;
}

/**
 * El cuerpo por SEGMENTOS, no como un trazo continuo.
 *
 * Trazo dibuja exactamente eso —una línea que dobla visitando puntos— así que un
 * Snake hecho con la misma primitiva daba dos iconos gemelos en la misma
 * portada. Acá el cuerpo son casillas, que además es como se ve el juego.
 *
 * La dirección se lee sin dibujar una cara: la opacidad crece de la cola a la
 * cabeza, y la fruta está justo enfrente de hacia donde dobla.
 */
export function SnakeIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="1.8" y="15.6" width="6.2" height="6.2" rx="1.9" fill="currentColor" opacity="0.35" />
      <rect x="8.7" y="15.6" width="6.2" height="6.2" rx="1.9" fill="currentColor" opacity="0.6" />
      <rect x="15.6" y="15.6" width="6.2" height="6.2" rx="1.9" fill="currentColor" opacity="0.8" />
      {/* La cabeza, doblando hacia arriba. */}
      <rect x="15.6" y="8.7" width="6.2" height="6.2" rx="2.1" fill="currentColor" />
      {/* La fruta, en línea con la cabeza. */}
      <circle cx="18.7" cy="3.4" r="2.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
