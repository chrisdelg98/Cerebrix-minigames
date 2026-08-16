import { cluesForGrid, isSolvableByLines } from './lines';
import { type Clue, type NonogramConfig } from './types';

/** mulberry32 — same shape of PRNG the other games use: small, seedable, fine. */
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

export interface Puzzle {
  size: number;
  solution: boolean[];
  rowClues: Clue[];
  colClues: Clue[];
}

/**
 * Draw a random picture, read its clues, and keep it only if those clues can be
 * followed back to it by line logic alone.
 *
 * Rejection rather than repair, because a repaired picture stops being random
 * in ways that show: the same shapes start coming back. Rejecting is cheap —
 * one solve is well under a millisecond even at 15×15 — so the loop can afford
 * to be picky, and every puzzle that survives it is guaranteed to be finishable
 * without a single guess.
 */
export function generatePuzzle(config: NonogramConfig, seed?: string): Puzzle {
  const { size, density } = config;
  const rng = makeRng(seed ?? String(Date.now()));

  let best: Puzzle | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const solution: boolean[] = [];
    for (let i = 0; i < size * size; i += 1) solution.push(rng() < density);

    // An empty line is legal but reads as a mistake — a whole row of nothing
    // next to a number-less clue looks like the puzzle failed to load.
    if (hasEmptyLine(size, solution)) continue;

    const clues = cluesForGrid(size, solution);
    const puzzle: Puzzle = { size, solution, ...clues };

    best ??= puzzle;
    if (isSolvableByLines(puzzle)) return puzzle;
  }

  /*
   * Unreachable in practice at the shipped sizes and densities — the loop finds
   * one in a handful of tries. Kept because the alternative is throwing inside
   * `createInitialState`, and a player who hits a bad seed deserves a board,
   * not an error screen. This one may need a guess; nothing else breaks.
   */
  const blank = new Array<boolean>(size * size).fill(false);
  return best ?? { size, solution: blank, ...cluesForGrid(size, blank) };
}

const MAX_ATTEMPTS = 400;

function hasEmptyLine(size: number, solution: readonly boolean[]): boolean {
  for (let i = 0; i < size; i += 1) {
    let row = false;
    let col = false;
    for (let j = 0; j < size; j += 1) {
      if (solution[i * size + j] === true) row = true;
      if (solution[j * size + i] === true) col = true;
    }
    if (!row || !col) return true;
  }
  return false;
}
