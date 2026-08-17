import { EMPTY, MOON, SIZE, SUN, type Constraint, type Value } from './types';

/**
 * Every legal row, precomputed once.
 *
 * A row is legal on its own if it holds three of each symbol and never three
 * in a row. There are only twenty ways to split six cells in half, so the whole
 * set fits in memory and the solver never has to reason about a single cell —
 * it places whole rows and only has to check the columns.
 */
export const ROWS: readonly Value[][] = (() => {
  const out: Value[][] = [];

  for (let mask = 0; mask < 1 << SIZE; mask += 1) {
    const row: Value[] = [];
    let suns = 0;
    for (let c = 0; c < SIZE; c += 1) {
      const sun = (mask >> c) % 2 === 1;
      if (sun) suns += 1;
      row.push(sun ? SUN : MOON);
    }
    if (suns !== SIZE / 2) continue;
    if (hasTriple(row)) continue;
    out.push(row);
  }

  return out;
})();

function hasTriple(line: readonly Value[]): boolean {
  for (let i = 2; i < line.length; i += 1) {
    if (line[i] !== EMPTY && line[i] === line[i - 1] && line[i] === line[i - 2]) return true;
  }
  return false;
}

interface Puzzle {
  given: readonly boolean[];
  values: readonly Value[];
  constraints: readonly Constraint[];
}

/**
 * Counts solutions, stopping at `limit`.
 *
 * Stopping early is the point: the generator only ever asks "is there exactly
 * one", and an exhaustive count of a board with many solutions costs far more
 * than the answer is worth.
 */
export function countSolutions(puzzle: Puzzle, limit = 2): number {
  const { given, values, constraints } = puzzle;

  // Constraints indexed by the row they can first be judged in.
  const horizontal: Constraint[][] = Array.from({ length: SIZE }, () => []);
  const vertical: Constraint[][] = Array.from({ length: SIZE }, () => []);
  for (const constraint of constraints) {
    const row = Math.floor(constraint.i / SIZE);
    if (constraint.j === constraint.i + 1) horizontal[row]?.push(constraint);
    else vertical[row + 1]?.push(constraint);
  }

  const grid: Value[][] = [];
  const sunsPerColumn = new Array<number>(SIZE).fill(0);
  let found = 0;

  const fits = (row: number, candidate: Value[]): boolean => {
    for (let c = 0; c < SIZE; c += 1) {
      const index = row * SIZE + c;
      if (given[index] === true && values[index] !== candidate[c]) return false;

      // Three the same going down, checked as soon as the third row exists.
      const above = grid[row - 1]?.[c];
      const twoAbove = grid[row - 2]?.[c];
      if (candidate[c] === above && candidate[c] === twoAbove) return false;

      const suns = (sunsPerColumn[c] ?? 0) + (candidate[c] === SUN ? 1 : 0);
      const rowsLeft = SIZE - row - 1;
      // Too many suns already, or too few left to ever reach three.
      if (suns > SIZE / 2 || suns + rowsLeft < SIZE / 2) return false;
    }

    for (const constraint of horizontal[row] ?? []) {
      const a = candidate[constraint.i % SIZE];
      const b = candidate[constraint.j % SIZE];
      if ((a === b) !== constraint.same) return false;
    }

    for (const constraint of vertical[row] ?? []) {
      const a = grid[row - 1]?.[constraint.i % SIZE];
      const b = candidate[constraint.j % SIZE];
      if ((a === b) !== constraint.same) return false;
    }

    return true;
  };

  const place = (row: number): void => {
    if (found >= limit) return;
    if (row === SIZE) {
      found += 1;
      return;
    }

    for (const candidate of ROWS) {
      if (!fits(row, candidate)) continue;

      grid[row] = candidate;
      for (let c = 0; c < SIZE; c += 1) {
        if (candidate[c] === SUN) sunsPerColumn[c] = (sunsPerColumn[c] ?? 0) + 1;
      }

      place(row + 1);

      for (let c = 0; c < SIZE; c += 1) {
        if (candidate[c] === SUN) sunsPerColumn[c] = (sunsPerColumn[c] ?? 0) - 1;
      }
      if (found >= limit) return;
    }
  };

  place(0);
  return found;
}

/**
 * The cells the player's board currently breaks a rule on.
 *
 * Shown live, unlike Sudoku's conflicts or Nonograma's wrong squares, because
 * here the rules are the puzzle rather than the answer: pointing at three suns
 * in a row tells nobody where the suns go.
 */
export function violations(values: readonly Value[], constraints: readonly Constraint[]): number[] {
  const bad = new Set<number>();

  for (let line = 0; line < SIZE; line += 1) {
    const row: Value[] = [];
    const col: Value[] = [];
    for (let k = 0; k < SIZE; k += 1) {
      row.push(values[line * SIZE + k] ?? EMPTY);
      col.push(values[k * SIZE + line] ?? EMPTY);
    }
    flagTriples(row, bad, (k) => line * SIZE + k);
    flagTriples(col, bad, (k) => k * SIZE + line);
    flagCount(row, bad, (k) => line * SIZE + k);
    flagCount(col, bad, (k) => k * SIZE + line);
  }

  for (const constraint of constraints) {
    const a = values[constraint.i] ?? EMPTY;
    const b = values[constraint.j] ?? EMPTY;
    if (a === EMPTY || b === EMPTY) continue;
    if ((a === b) !== constraint.same) {
      bad.add(constraint.i);
      bad.add(constraint.j);
    }
  }

  return [...bad];
}

function flagTriples(line: Value[], bad: Set<number>, at: (k: number) => number): void {
  for (let k = 2; k < SIZE; k += 1) {
    if (line[k] === EMPTY) continue;
    if (line[k] === line[k - 1] && line[k] === line[k - 2]) {
      bad.add(at(k));
      bad.add(at(k - 1));
      bad.add(at(k - 2));
    }
  }
}

/** Only flags a line once it has gone over — four of one symbol can never work. */
function flagCount(line: Value[], bad: Set<number>, at: (k: number) => number): void {
  for (const symbol of [SUN, MOON] as const) {
    const hits: number[] = [];
    for (let k = 0; k < SIZE; k += 1) if (line[k] === symbol) hits.push(k);
    if (hits.length > SIZE / 2) for (const k of hits) bad.add(at(k));
  }
}
