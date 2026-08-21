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
 * Lo que le faltaba para leerse como un bicho y no como fichas sueltas:
 *
 *  - Que los segmentos **se toquen**. Antes quedaba medio punto de aire entre
 *    ellos y con las esquinas tan redondeadas se leían como piezas separadas.
 *    Ahora comparten borde exacto y el redondeo deja un pellizco en la unión,
 *    que es justo lo que hace que se vea articulado.
 *  - **Dos vueltas en vez de una.** Una sola curva se lee como una escuadra;
 *    con dos el cuerpo serpentea.
 *  - **Un ojo.** Es la señal más barata y más fuerte de que eso está vivo, y
 *    además dice hacia dónde va sin dibujar una cara.
 *
 * La opacidad crece de la cola a la cabeza, y la fruta está enfrente de la boca.
 */
export function SnakeIcon({ size = 24 }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Cola arriba a la izquierda, bajando y doblando dos veces. */}
      <rect x="1.5" y="3" width="6" height="6" rx="1.7" fill="currentColor" opacity="0.3" />
      <rect x="1.5" y="9" width="6" height="6" rx="1.7" fill="currentColor" opacity="0.48" />
      <rect x="7.5" y="9" width="6" height="6" rx="1.7" fill="currentColor" opacity="0.66" />
      <rect x="7.5" y="15" width="6" height="6" rx="1.7" fill="currentColor" opacity="0.84" />

      {/* La cabeza, mirando a la derecha. */}
      <rect x="13.5" y="15" width="6" height="6" rx="1.9" fill="currentColor" />
      <circle cx="17.5" cy="17.4" r="1.05" fill="var(--c-surface)" />

      {/* La fruta, justo enfrente. */}
      <circle cx="21.6" cy="18" r="2" fill="currentColor" opacity="0.45" />
    </svg>
  );
}
