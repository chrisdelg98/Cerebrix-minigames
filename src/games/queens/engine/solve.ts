import { QUEEN, type Cell } from './types';

/**
 * Arrangements, up to `limit` of them.
 *
 * One queen per row is baked into the shape of the search rather than checked:
 * the recursion goes row by row and places exactly one. That leaves only three
 * things to test — the column, the region, and whether it touches the queen in
 * the row above, which is the only row it can touch given the first rule.
 *
 * It returns the arrangements and not just how many because the generator needs
 * to SEE the rival solution in order to break it.
 */
export function findSolutions(size: number, regions: readonly number[], limit = 2): number[][] {
  const columns = new Array<boolean>(size).fill(false);
  const used = new Array<boolean>(size).fill(false);
  const current: number[] = [];
  const found: number[][] = [];

  const place = (row: number): void => {
    if (found.length >= limit) return;
    if (row === size) {
      found.push([...current]);
      return;
    }

    const previous = row === 0 ? -2 : (current[row - 1] as number);

    for (let col = 0; col < size; col += 1) {
      if (columns[col] === true) continue;
      if (Math.abs(col - previous) <= 1) continue;

      const region = regions[row * size + col] as number;
      if (used[region] === true) continue;

      columns[col] = true;
      used[region] = true;
      current.push(col);

      place(row + 1);

      current.pop();
      columns[col] = false;
      used[region] = false;
      if (found.length >= limit) return;
    }
  };

  place(0);
  return found;
}

export function countSolutions(size: number, regions: readonly number[], limit = 2): number {
  return findSolutions(size, regions, limit).length;
}

/** Where the queens are, as [row, col] pairs. */
export function queensOn(marks: readonly Cell[], size: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < marks.length; i += 1) {
    if (marks[i] === QUEEN) out.push([Math.floor(i / size), i % size]);
  }
  return out;
}

/**
 * The queens that break a rule, right now.
 *
 * Shown live, like Tango and unlike Sudoku: two queens in the same column is a
 * rule, not the answer. Pointing at it tells nobody where the queens go.
 */
export function violations(
  marks: readonly Cell[],
  regions: readonly number[],
  size: number
): number[] {
  const placed = queensOn(marks, size);
  const bad = new Set<number>();

  for (let a = 0; a < placed.length; a += 1) {
    for (let b = a + 1; b < placed.length; b += 1) {
      const [ra, ca] = placed[a] as [number, number];
      const [rb, cb] = placed[b] as [number, number];

      const clash =
        ra === rb ||
        ca === cb ||
        regions[ra * size + ca] === regions[rb * size + cb] ||
        (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1);

      if (clash) {
        bad.add(ra * size + ca);
        bad.add(rb * size + cb);
      }
    }
  }

  return [...bad];
}

/** True where a queen could still legally go, given the ones already placed. */
export function candidates(
  marks: readonly Cell[],
  regions: readonly number[],
  size: number
): boolean[] {
  const placed = queensOn(marks, size);

  return marks.map((mark, i) => {
    if (mark !== 0) return false;

    const row = Math.floor(i / size);
    const col = i % size;

    return !placed.some(
      ([r, c]) =>
        r === row ||
        c === col ||
        regions[r * size + c] === regions[i] ||
        (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1)
    );
  });
}
