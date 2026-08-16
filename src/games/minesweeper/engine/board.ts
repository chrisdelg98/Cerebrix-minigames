import { type MinesweeperState } from './types';

/**
 * Board geometry and the rules that depend only on it. Pure — no React, no CSS.
 *
 * Unlike Sudoku's, none of this can be precomputed at module load: the board
 * size changes with the difficulty, so neighbours are derived per call.
 */

export const MINE = -1;

export const rowOf = (index: number, cols: number): number => Math.floor(index / cols);
export const colOf = (index: number, cols: number): number => index % cols;

/** The up-to-eight cells touching this one, edges and corners included. */
export function neighbours(index: number, cols: number, rows: number): number[] {
  const row = rowOf(index, cols);
  const col = colOf(index, cols);
  const found: number[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      found.push(r * cols + c);
    }
  }
  return found;
}

/** Deterministic PRNG, so a seed always lays the same minefield. */
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

/**
 * Lays the mines, keeping the first click AND its neighbours clear.
 *
 * Clearing only the clicked cell is not enough: an opening that reveals a
 * single number tells the player nothing and makes the first move a coin flip.
 * With its neighbours clear the first click always opens a region.
 */
export function seedMines(state: MinesweeperState, safeIndex: number): MinesweeperState {
  const total = state.cols * state.rows;
  const forbidden = new Set([safeIndex, ...neighbours(safeIndex, state.cols, state.rows)]);

  const candidates: number[] = [];
  for (let i = 0; i < total; i++) if (!forbidden.has(i)) candidates.push(i);

  // Fisher-Yates over the allowed cells, then take the first N.
  const random = rng(`${state.seed}:${String(safeIndex)}`);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j] as number, candidates[i] as number];
  }

  const values = new Array<number>(total).fill(0);
  for (const index of candidates.slice(0, Math.min(state.mines, candidates.length))) {
    values[index] = MINE;
  }

  for (let i = 0; i < total; i++) {
    if (values[i] === MINE) continue;
    values[i] = neighbours(i, state.cols, state.rows).filter((n) => values[n] === MINE).length;
  }

  return { ...state, values, seeded: true };
}

/**
 * Reveals a cell and, when it has no neighbouring mines, everything it opens
 * onto. Iterative and not recursive: an expert board can cascade over hundreds
 * of cells, and the call stack is not the place to find that out.
 */
export function floodReveal(
  values: readonly number[],
  revealed: boolean[],
  flagged: readonly boolean[],
  start: number,
  cols: number,
  rows: number
): void {
  if (revealed[start] === true || flagged[start] === true) return;

  const queue = [start];
  while (queue.length > 0) {
    const index = queue.pop() as number;
    if (revealed[index] === true || flagged[index] === true) continue;
    revealed[index] = true;

    if (values[index] === 0) {
      for (const n of neighbours(index, cols, rows)) {
        if (revealed[n] !== true && flagged[n] !== true) queue.push(n);
      }
    }
  }
}

export const flagCount = (state: MinesweeperState): number => state.flagged.filter(Boolean).length;

/** Won when every cell that is not a mine has been revealed. */
export function isCleared(state: MinesweeperState): boolean {
  if (!state.seeded) return false;
  for (let i = 0; i < state.values.length; i++) {
    if (state.values[i] !== MINE && state.revealed[i] !== true) return false;
  }
  return true;
}

/** Chebyshev distance — the shape a reveal cascade actually spreads in. */
export const distance = (a: number, b: number, cols: number): number =>
  Math.max(Math.abs(rowOf(a, cols) - rowOf(b, cols)), Math.abs(colOf(a, cols) - colOf(b, cols)));
