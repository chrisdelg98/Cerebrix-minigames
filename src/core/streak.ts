/**
 * Cuándo una racha merece festejo, y cuánto.
 *
 * Vive en /core porque una racha es del shell: /design dibuja las chispas sin
 * saber qué las causa, igual que el selector de dificultad no sabe qué es una
 * dificultad. Este archivo es la costura entre las dos cosas.
 */

/** Desde acá la racha empieza a echar chispas. */
export const SPARKS_FROM = 5;

/** Y desde acá ya no crecen más: el premio tiene un techo. */
export const SPARKS_FULL = 20;

/**
 * Cuánto tiene que brillar la racha, de 0 a 1. `null` es "todavía nada".
 *
 * Arranca en 0.25 y no en 0 para que la primera vez que aparece ya se note — un
 * premio que debuta invisible no premia nada — y llega a 1 a las veinte.
 * Después no sigue: si creciera para siempre, una racha larga terminaría siendo
 * una distracción encima de la pantalla que existe para elegir un juego.
 */
export function sparkIntensity(streak: number): number | null {
  if (streak < SPARKS_FROM) return null;
  const t = Math.min(1, (streak - SPARKS_FROM) / (SPARKS_FULL - SPARKS_FROM));
  return 0.25 + t * 0.75;
}

/**
 * La racha a partir de la cual la ficha lleva anillo: un escalón por encima del
 * techo de las chispas.
 *
 * Se calcula y no se escribe: si mañana se mueve `SPARKS_FULL`, el nivel máximo
 * lo sigue solo, y no quedan dos números que hay que acordarse de mover juntos.
 * Llegar al techo es el final de la rampa; pasarlo es otra cosa.
 */
export const CROWNED_FROM = SPARKS_FULL + 1;

export function isCrowned(streak: number): boolean {
  return streak >= CROWNED_FROM;
}
