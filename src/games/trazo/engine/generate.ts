import { countPaths, neighbours } from './solve';
import { type TrazoConfig } from './types';

function makeRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Un recorrido al azar que pasa por todas las casillas.
 *
 * Elige primero el vecino con menos salidas libres — la heurística de
 * Warnsdorff. Sin ella el recorrido se mete en un rincón y hay que deshacer
 * medio tablero; con ella sale casi siempre al primer intento.
 */
function fullPath(size: number, rng: () => number): number[] | null {
  const total = size * size;
  const near = neighbours(size);
  const visited = new Array<boolean>(total).fill(false);
  const path: number[] = [];

  const free = (at: number): number =>
    (near[at] as number[]).filter((n) => visited[n] !== true).length;

  const walk = (at: number): boolean => {
    visited[at] = true;
    path.push(at);
    if (path.length === total) return true;

    const options = (near[at] as number[])
      .filter((n) => visited[n] !== true)
      .map((n) => ({ n, weight: free(n) + rng() * 0.5 }))
      .sort((a, b) => a.weight - b.weight);

    for (const { n } of options) if (walk(n)) return true;

    visited[at] = false;
    path.pop();
    return false;
  };

  const first = Math.floor(rng() * total);
  return walk(first) ? path : null;
}

export interface Puzzle {
  size: number;
  numbers: number[];
  solution: number[];
}

function numbersFrom(size: number, path: readonly number[], marks: Set<number>): number[] {
  const numbers = new Array<number>(size * size).fill(0);
  [...marks]
    .sort((a, b) => a - b)
    .forEach((position, rank) => {
      numbers[path[position] as number] = rank + 1;
    });
  return numbers;
}

/**
 * Saca los números que sobran.
 *
 * La reparación clava uno cada vez que aparece un rival, y termina marcando
 * casi todo el tablero: eso deja de ser un rompecabezas y pasa a ser unir
 * puntos. Acá se prueba a sacar cada uno y se queda solo el que hace falta —
 * el primero y el último nunca, que son el principio y el final.
 */
function thinned(
  size: number,
  path: readonly number[],
  marks: Set<number>,
  rng: () => number,
  keep: number
): number[] {
  const removable = [...marks].filter((position) => position !== 0 && position !== path.length - 1);
  for (let i = removable.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [removable[i], removable[j]] = [removable[j] as number, removable[i] as number];
  }

  for (const position of removable) {
    if (marks.size <= keep) break;
    marks.delete(position);
    // Rendirse cuenta como "no pude demostrarlo": el número se queda.
    const check = countPaths(size, numbersFrom(size, path, marks));
    if (check.exhausted || check.found !== 1) marks.add(position);
  }

  return numbersFrom(size, path, marks);
}

/**
 * Dibuja un recorrido y le va clavando números hasta que sea el único posible.
 *
 * El primero y el último son obligatorios: sin ellos el recorrido no tiene ni
 * principio ni final. Los del medio se agregan de a uno, y siempre **donde el
 * recorrido rival se separa del bueno** — clavar un número ahí es exactamente
 * lo que vuelve imposible al rival, así que cada número que se agrega hace
 * falta. Poner números al azar hasta que dé único deja un tablero lleno de
 * pistas que no servían para nada.
 */
export function generatePuzzle(config: TrazoConfig, seed?: string): Puzzle {
  const { size } = config;
  const rng = makeRng(seed ?? String(Date.now()));

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const path = fullPath(size, rng);
    if (path === null) continue;

    const marks = new Set([0, path.length - 1]);

    for (let step = 0; step < size * size; step += 1) {
      const numbers = numbersFrom(size, path, marks);
      const { found, samples, exhausted } = countPaths(size, numbers);
      if (exhausted) break;

      if (found === 1)
        return { size, numbers: thinned(size, path, marks, rng, config.keep), solution: [...path] };

      // El rival, no el primero que salga: el buscador puede encontrar el bueno
      // antes que el otro, y compararlo consigo mismo no separa nada.
      const rival = samples.find((candidate) => candidate.some((cell, i) => cell !== path[i]));
      if (rival === undefined) break;

      /*
       * El primer punto libre a partir de donde se separan.
       *
       * Cortar cuando ese punto ya tenía número dejaba el tablero ambiguo: el
       * rival puede separarse justo en un número y volver a juntarse después,
       * y lo que hay que clavar es el primer lugar donde todavía se lo puede
       * obligar.
       */
      const diverge = rival.findIndex((cell, i) => cell !== path[i]);
      if (diverge <= 0) break;

      let spot = diverge;
      while (spot < path.length - 1 && marks.has(spot)) spot += 1;
      if (marks.has(spot)) break;
      marks.add(spot);
    }
  }

  const fallback = fullPath(size, rng) ?? [...Array(size * size).keys()];
  return {
    size,
    numbers: numbersFrom(size, fallback, new Set([0, fallback.length - 1])),
    solution: fallback,
  };
}
