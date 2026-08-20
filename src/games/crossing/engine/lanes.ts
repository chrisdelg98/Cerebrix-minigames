import { type Lane } from './types';

/**
 * El mundo se DERIVA, no se guarda.
 *
 * Cada fila y cada auto salen de una función de la semilla y del número de
 * fila, así que el estado no crece nunca por más que el jugador avance, y dos
 * partidas con la misma semilla son idénticas. Guardar el mundo habría
 * significado generarlo a medida que se avanza — y generar sobre la marcha es
 * lo que hace que un motor deje de ser puro.
 */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Un número de 0 a 1, estable para cada (semilla, fila, sal). */
function noise(seed: string, row: number, salt: number): number {
  let a = hash(`${seed}:${String(row)}:${String(salt)}`);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Cuántas filas de vereda hay al principio antes de la primera calle. */
export const SAFE_START = 2;

/**
 * Qué hay en una fila del mundo.
 *
 * Las primeras filas son siempre vereda: nadie debería morir antes de entender
 * qué hace cada gesto. Y dos calles nunca van seguidas de más de dos, para que
 * siempre haya dónde parar a mirar.
 */
export function laneAt(seed: string, row: number, traffic: number): Lane {
  if (row <= SAFE_START) {
    return { kind: 'safe', dir: 1, every: 1, gap: 4, offset: 0 };
  }

  const roll = noise(seed, row, 1);
  // Tres calles seguidas es una trampa, no un desafío.
  const forcedSafe =
    row > SAFE_START + 2 && isRoad(seed, row - 1, traffic) && isRoad(seed, row - 2, traffic);

  if (forcedSafe || roll > traffic) {
    return { kind: 'safe', dir: 1, every: 1, gap: 4, offset: 0 };
  }

  return {
    kind: 'road',
    dir: noise(seed, row, 2) > 0.5 ? 1 : -1,
    // Más lejos, más rápido: la presión sube con la distancia.
    every: Math.max(1, 4 - Math.floor(row / 14) - Math.floor(noise(seed, row, 3) * 2)),
    gap: 3 + Math.floor(noise(seed, row, 4) * 3),
    offset: Math.floor(noise(seed, row, 5) * 12),
  };
}

/** Sin la regla de "no tres seguidas", para poder consultarla sin recursión. */
function isRoad(seed: string, row: number, traffic: number): boolean {
  if (row <= SAFE_START) return false;
  return noise(seed, row, 1) <= traffic;
}

/**
 * Las columnas que ocupan los autos de una fila en un tick dado.
 *
 * Los autos van parejos y a distancia fija: es más fácil de leer que un tráfico
 * irregular y, sobre todo, es JUSTO — el jugador puede ver el hueco y calcular
 * el paso, que es de lo que se trata el juego.
 */
export function carsAt(lane: Lane, cols: number, ticks: number): number[] {
  return carTrain(lane, cols, ticks)
    .map((car) => car.col)
    .filter((col) => col >= 0 && col < cols);
}

export interface Car {
  /**
   * Cuál auto de la fila es, no dónde está.
   *
   * La vista lo usa como clave: con la posición como clave, un auto que sale por
   * un borde y otro que entra por el otro serían elementos distintos y la
   * animación parpadearía. Con el número de auto, cada uno se corre una casilla
   * por paso y la transición lo desliza.
   */
  id: number;
  col: number;
}

/**
 * Los mismos autos, incluidos los que están justo afuera del tablero.
 *
 * El margen es lo que evita el salto al dar la vuelta: sin él, un auto que
 * llega al borde reaparecería del otro lado y la transición lo haría cruzar la
 * pantalla entera al revés. Saliendo y entrando por los costados, cada auto
 * recorre su camino y desaparece.
 */
export function carTrain(lane: Lane, cols: number, ticks: number): Car[] {
  if (lane.kind !== 'road') return [];

  const moved = Math.floor(ticks / lane.every) * lane.dir;
  const cars: Car[] = [];

  // Un auto de margen a cada lado: entra dibujado y sale dibujado.
  const first = Math.floor((-2 - lane.offset - moved) / lane.gap);
  const last = Math.ceil((cols + 1 - lane.offset - moved) / lane.gap);

  for (let id = first; id <= last; id += 1) {
    const col = lane.offset + moved + id * lane.gap;
    if (col >= -2 && col <= cols + 1) cars.push({ id, col });
  }
  return cars;
}
