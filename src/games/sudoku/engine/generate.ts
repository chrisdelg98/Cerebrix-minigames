import { CELLS, PEERS, gridToString } from './grid';

/**
 * Sudoku generation, as pure functions. No DOM, no worker API — the worker is
 * just a thread that calls this, and the tests call the same thing directly.
 *
 * The algorithm mirrors scripts/generate-puzzles.mjs on purpose: the shipped
 * JSON and anything generated at runtime have to be the same kind of puzzle.
 */

export interface GeneratedPuzzle {
  /** 81 chars, '.' for a hole. */
  p: string;
  /** 81 chars, the one solution. */
  s: string;
  /** How many clues survived the dig. */
  c: number;
}

/** Clues left on the board, per difficulty. 17 is the known minimum. */
export const CLUES: Readonly<Record<number, number>> = { 1: 45, 2: 40, 3: 34, 4: 30, 5: 26 };

/** Deterministic from the seed, so the same seed yields the same board. */
function rng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

const canPlace = (grid: readonly number[], index: number, value: number): boolean =>
  (PEERS[index] ?? []).every((peer) => grid[peer] !== value);

/**
 * Counts solutions, stopping at `limit`.
 *
 * Most-constrained cell first. Without that heuristic, digging a 26-clue board
 * spends minutes in the search instead of milliseconds — which is the whole
 * difference between generating on the fly and not.
 */
function countSolutions(grid: number[], limit = 2): number {
  let best = -1;
  let candidates: number[] | null = null;

  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) continue;
    const options: number[] = [];
    for (let v = 1; v <= 9; v++) if (canPlace(grid, i, v)) options.push(v);
    if (options.length === 0) return 0;
    if (candidates === null || options.length < candidates.length) {
      best = i;
      candidates = options;
      if (options.length === 1) break;
    }
  }

  if (best === -1) return 1;

  let found = 0;
  for (const value of candidates ?? []) {
    grid[best] = value;
    found += countSolutions(grid, limit - found);
    grid[best] = 0;
    if (found >= limit) break;
  }
  return found;
}

function fullGrid(random: () => number): number[] | null {
  const grid = new Array<number>(CELLS).fill(0);

  const search = (): boolean => {
    let best = -1;
    let candidates: number[] | null = null;
    for (let i = 0; i < CELLS; i++) {
      if (grid[i] !== 0) continue;
      const options: number[] = [];
      for (let v = 1; v <= 9; v++) if (canPlace(grid, i, v)) options.push(v);
      if (options.length === 0) return false;
      if (candidates === null || options.length < candidates.length) {
        best = i;
        candidates = options;
      }
    }
    if (best === -1) return true;

    for (const value of shuffled(candidates ?? [], random)) {
      grid[best] = value;
      if (search()) return true;
      grid[best] = 0;
    }
    return false;
  };

  return search() ? grid : null;
}

/**
 * Removes clues while the solution stays unique, in 180°-symmetric pairs.
 *
 * Symmetry is what makes a Sudoku *look* like one: an asymmetric board reads as
 * noise even when it is perfectly valid.
 */
function dig(full: readonly number[], target: number, random: () => number) {
  const grid = [...full];
  let clues = CELLS;

  for (const index of shuffled([...Array(CELLS).keys()], random)) {
    if (clues <= target) break;
    if (grid[index] === 0) continue;

    const partner = CELLS - 1 - index;
    const removed = [index];
    const backup = [grid[index] as number];
    grid[index] = 0;

    if (partner !== index && grid[partner] !== 0 && clues - 1 > target) {
      removed.push(partner);
      backup.push(grid[partner] as number);
      grid[partner] = 0;
    }

    if (countSolutions([...grid]) === 1) {
      clues -= removed.length;
    } else {
      removed.forEach((cell, i) => {
        grid[cell] = backup[i] as number;
      });
    }
  }

  return { grid, clues };
}

/**
 * One puzzle with a verified-unique solution, or null if the dig did not get
 * close enough to the target. Callers retry or fall back.
 */
export function generatePuzzle(difficulty: number, seed: string): GeneratedPuzzle | null {
  const random = rng(seed);
  const full = fullGrid(random);
  if (!full) return null;

  const target = CLUES[difficulty] ?? CLUES[3] ?? 34;
  const { grid, clues } = dig(full, target, random);

  // Reject a board that missed by too much rather than ship an "expert" puzzle
  // with forty clues.
  if (clues > target + 4) return null;

  return { p: gridToString(grid), s: gridToString(full), c: clues };
}
