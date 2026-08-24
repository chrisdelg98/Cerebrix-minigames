/**
 * La paleta de regiones del sistema de diseño, **ordenada por cuánto se
 * distinguen entre sí**.
 *
 * Son `--c-region-1..9`: nueve matices ya lavados, con su versión para tema
 * oscuro, que existían en `theme.css` sin que ningún juego los usara. Son los
 * correctos acá — la primera versión de esta pantalla usaba `--c-trace-*`, que
 * es una escala de seis pensada para pintar UNA línea por tablero, no para
 * repartir cuarenta piezas: lavados, el teal y el verde de esa escala son casi
 * el mismo color, y lo mismo el índigo con el celeste.
 *
 * El orden NO es el del token, es el que sale de medir. Convirtiendo cada uno a
 * OKLab compuesto sobre la casilla y armando la secuencia que maximiza la
 * distancia mínima, queda: ámbar, violeta, teal, rojo, celeste, naranja,
 * índigo, verde, rosa. Distancia mínima con los primeros cuatro: 0.055; con
 * cinco, 0.035; con los nueve, 0.014.
 *
 * Importa porque se toman **los primeros N**, con N las áreas distintas del
 * tablero. Los niveles bajos tienen tres o cuatro áreas y se llevan los matices
 * más separados; los altos llegan a once y ahí la repetición es inevitable — no
 * existen once lavados claramente distintos.
 */
export const TONES = [
  'var(--c-region-2)',
  'var(--c-region-6)',
  'var(--c-region-1)',
  'var(--c-region-4)',
  'var(--c-region-8)',
  'var(--c-region-7)',
  'var(--c-region-3)',
  'var(--c-region-5)',
  'var(--c-region-9)',
] as const;

function hash(numbers: readonly number[]): number {
  let h = 2166136261;
  for (const value of numbers) {
    h ^= value + 1;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Un matiz por NÚMERO, no por rectángulo.
 *
 * Todos los 2 de una partida son del mismo color, todos los 4 de otro. Así el
 * color deja de ser decoración y pasa a ser información: se ve de un vistazo qué
 * áreas hay repartidas y cuáles faltan.
 *
 * La versión anterior coloreaba por vecindad —dos pegados nunca compartían— y
 * era correcta pero incómoda de leer: el mismo 2 salía de cinco colores
 * distintos en el mismo tablero, y el color no significaba nada.
 *
 * Se toman los N primeros de la paleta, que son los más separados entre sí, y
 * **se barajan con el tablero**: la misma partida da siempre los mismos colores
 * —si se sorteara en cada render, parpadearía— y otra partida los da distintos.
 * La permutación sale de los propios números, así que no hay que guardar nada en
 * el estado.
 */
export function tonesByNumber(numbers: readonly number[]): Map<number, string> {
  const distinct = [...new Set(numbers.filter((value) => value > 0))].sort((a, b) => a - b);

  // Solo los que hacen falta, empezando por los más distinguibles.
  const usable: string[] = TONES.slice(0, Math.max(1, Math.min(distinct.length, TONES.length)));

  const rng = rngFrom(hash(numbers));
  for (let i = usable.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [usable[i], usable[j]] = [usable[j] as string, usable[i] as string];
  }

  const out = new Map<number, string>();
  distinct.forEach((value, i) => {
    out.set(value, usable[i % usable.length] ?? TONES[0]);
  });
  return out;
}
