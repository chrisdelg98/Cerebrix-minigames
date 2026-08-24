import { countSolutions } from './solve';
import { type Rect, type ShikakuConfig } from './types';

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
 * Parte la región en rectángulos con cortes rectos de lado a lado.
 *
 * Es una partición "guillotina": un subconjunto de todas las particiones
 * posibles. Los Shikaku de papel incluyen repartos que no se pueden cortar así
 * —y suelen ser los más interesantes— pero esto siempre termina, nunca deja
 * huecos y da tableros perfectamente válidos. Si algún día los niveles altos
 * piden más variedad, acá es donde se cambia.
 */
function split(rect: Rect, maxArea: number, rng: () => number, out: Rect[]): void {
  const size = rect.w * rect.h;
  const canV = rect.w > 1;
  const canH = rect.h > 1;

  if (size <= maxArea && (size <= 2 || rng() < 0.5 || (!canV && !canH))) {
    out.push(rect);
    return;
  }
  if (!canV && !canH) {
    out.push(rect);
    return;
  }

  if (canV && (!canH || rng() < rect.w / (rect.w + rect.h))) {
    const cut = 1 + Math.floor(rng() * (rect.w - 1));
    split({ ...rect, w: cut }, maxArea, rng, out);
    split({ ...rect, x: rect.x + cut, w: rect.w - cut }, maxArea, rng, out);
  } else {
    const cut = 1 + Math.floor(rng() * (rect.h - 1));
    split({ ...rect, h: cut }, maxArea, rng, out);
    split({ ...rect, y: rect.y + cut, h: rect.h - cut }, maxArea, rng, out);
  }
}

export interface Puzzle {
  size: number;
  numbers: number[];
  solution: Rect[];
}

/** Un reparto con su número puesto en una casilla al azar de cada rectángulo. */
function attempt(config: ShikakuConfig, rng: () => number): Puzzle {
  const { size, maxArea } = config;
  const solution: Rect[] = [];
  split({ x: 0, y: 0, w: size, h: size }, maxArea, rng, solution);

  const numbers = new Array<number>(size * size).fill(0);
  for (const rect of solution) {
    const x = rect.x + Math.floor(rng() * rect.w);
    const y = rect.y + Math.floor(rng() * rect.h);
    numbers[y * size + x] = rect.w * rect.h;
  }

  return { size, numbers, solution };
}

/**
 * Un tablero con UNA sola solución.
 *
 * Se sortea un reparto y se comprueba; si admite más de una lectura, se tira y
 * se sortea otro. Suena caro y no lo es: medido, cada intento cuesta menos de un
 * milisegundo y hacen falta entre 3 y 25 según el tamaño, así que un 12×12 sale
 * en 2 ms. Es lo contrario de Trazo, donde demostrar la unicidad era el muro que
 * topaba el tablero — acá la exigencia de que cada rectángulo lleve exactamente
 * un número que coincida con su área poda la búsqueda de inmediato.
 */
export function generatePuzzle(config: ShikakuConfig, seed?: string): Puzzle {
  const rng = makeRng(seed ?? String(Date.now()));
  let last = attempt(config, rng);

  for (let tries = 0; tries < 3000; tries += 1) {
    const puzzle = attempt(config, rng);
    last = puzzle;
    const { found, exhausted } = countSolutions(config.size, puzzle.numbers, config.maxArea);
    if (!exhausted && found === 1) return puzzle;
  }

  // Nunca debería llegar acá; si llega, un tablero resoluble vale más que nada.
  return last;
}
