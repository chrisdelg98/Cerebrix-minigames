import { type SudokuState } from './types';

/**
 * Grid geometry and the rules that depend only on it. Pure, no React, no CSS —
 * the view imports the same helpers it uses to paint, so "which cells conflict"
 * has exactly one definition in the codebase.
 */

export const SIZE = 9;
export const CELLS = SIZE * SIZE;

export const rowOf = (index: number): number => Math.floor(index / SIZE);
export const colOf = (index: number): number => index % SIZE;
export const boxOf = (index: number): number =>
  Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);

/**
 * The 20 cells that share a row, column or box with this one.
 *
 * Built once at module load. Recomputing it per render would be 81 × 20 set
 * operations on every keystroke, on a board that has to stay at 60fps.
 */
export const PEERS: readonly (readonly number[])[] = (() => {
  const all: number[][] = [];
  for (let i = 0; i < CELLS; i++) {
    const peers = new Set<number>();
    for (let k = 0; k < CELLS; k++) {
      if (k === i) continue;
      if (rowOf(k) === rowOf(i) || colOf(k) === colOf(i) || boxOf(k) === boxOf(i)) peers.add(k);
    }
    all.push([...peers]);
  }
  return all;
})();

/**
 * Cells whose digit repeats within a row, column or box.
 *
 * Conflicts are DERIVED from the state rather than blocked at the door: Sudoku
 * is a game of deduction, and refusing to let a player write a digit tells them
 * it is wrong for free. They may write it; it shows up red until they fix it.
 */
export function conflictsIn(state: SudokuState): Set<number> {
  const conflicted = new Set<number>();

  for (let i = 0; i < CELLS; i++) {
    const value = state.values[i];
    if (value === undefined || value === 0) continue;

    for (const peer of PEERS[i] ?? []) {
      if (state.values[peer] === value) {
        conflicted.add(i);
        conflicted.add(peer);
      }
    }
  }
  return conflicted;
}

export const isComplete = (state: SudokuState): boolean =>
  state.values.every((value) => value !== 0);

export const isSolved = (state: SudokuState): boolean =>
  state.values.every((value, i) => value === state.solution[i]);

/* ─────────────────────────── Notes as bitmasks ─────────────────────────── */

export const hasNote = (mask: number, value: number): boolean => (mask & (1 << (value - 1))) !== 0;
export const toggleNote = (mask: number, value: number): number => mask ^ (1 << (value - 1));
export const clearNote = (mask: number, value: number): number => mask & ~(1 << (value - 1));

export function notesOf(mask: number): number[] {
  const values: number[] = [];
  for (let v = 1; v <= SIZE; v++) if (hasNote(mask, v)) values.push(v);
  return values;
}

/* ─────────────────────────── Parsing ─────────────────────────── */

/** "53..7...." → [5, 3, 0, 0, 7, 0, 0, 0, 0] */
export function parseGrid(source: string): number[] {
  if (source.length !== CELLS) {
    throw new Error(`A grid must be ${String(CELLS)} characters, got ${String(source.length)}`);
  }
  return [...source].map((char) => (char === '.' ? 0 : Number(char)));
}

export const gridToString = (values: readonly number[]): string =>
  values.map((value) => (value === 0 ? '.' : String(value))).join('');
