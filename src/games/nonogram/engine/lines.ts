import { CROSSED, FILLED, UNKNOWN, type Clue, type Mark } from './types';

/** The run lengths of a finished line. An all-empty line has no numbers. */
export function cluesFor(line: readonly boolean[]): number[] {
  const clue: number[] = [];
  let run = 0;

  for (const painted of line) {
    if (painted) {
      run += 1;
    } else if (run > 0) {
      clue.push(run);
      run = 0;
    }
  }
  if (run > 0) clue.push(run);

  return clue;
}

/**
 * Everything one line can be told on its own.
 *
 * It walks every arrangement of the clue that is compatible with what the
 * player already knows, and keeps the cells that come out the same in all of
 * them — those are forced, the rest are still open. This is the whole of
 * nonogram logic: a puzzle that can be finished by repeating this, line by
 * line, is a puzzle that never needs a guess.
 *
 * Returns `null` when the clue cannot fit what is on the line at all, which is
 * how the generator detects a contradiction.
 */
export function solveLine(clue: Clue, line: readonly Mark[]): Mark[] | null {
  const n = line.length;
  const arrangement = new Array<boolean>(n).fill(false);
  const alwaysFilled = new Array<boolean>(n).fill(true);
  const alwaysEmpty = new Array<boolean>(n).fill(true);
  let found = 0;

  // Minimum width still needed from group `ci` on: the blocks plus one gap
  // between each pair. Anything narrower cannot be completed, so stop early.
  const spanFrom: number[] = new Array<number>(clue.length + 1).fill(0);
  for (let ci = clue.length - 1; ci >= 0; ci -= 1) {
    const block = clue[ci] ?? 0;
    const rest = spanFrom[ci + 1] ?? 0;
    spanFrom[ci] = block + (ci === clue.length - 1 ? 0 : 1 + rest);
  }

  const blockFits = (start: number, len: number): boolean => {
    for (let i = start; i < start + len; i += 1) {
      if (line[i] === CROSSED) return false;
    }
    // The cell just past a block has to be a gap, so it cannot be painted.
    return !(start + len < n && line[start + len] === FILLED);
  };

  const place = (ci: number, from: number): void => {
    if (ci === clue.length) {
      // Whatever is left over is empty, so no painted cell may survive there.
      for (let i = from; i < n; i += 1) {
        if (line[i] === FILLED) return;
      }
      found += 1;
      for (let i = 0; i < n; i += 1) {
        if (arrangement[i] === true) alwaysEmpty[i] = false;
        else alwaysFilled[i] = false;
      }
      return;
    }

    const len = clue[ci] ?? 0;
    const need = spanFrom[ci] ?? 0;

    for (let start = from; start + need <= n; start += 1) {
      if (blockFits(start, len)) {
        arrangement.fill(true, start, start + len);
        place(ci + 1, start + len + 1);
        arrangement.fill(false, start, start + len);
      }
      // Sliding past a painted cell would leave it outside every block, and it
      // is not allowed to be empty. So this is as far right as the block goes.
      if (line[start] === FILLED) break;
    }
  };

  place(0, 0);
  if (found === 0) return null;

  return line.map((mark, i) => {
    if (alwaysFilled[i] === true) return FILLED;
    if (alwaysEmpty[i] === true) return CROSSED;
    return mark;
  });
}

/** Both sets of clues for a finished picture. */
export function cluesForGrid(
  size: number,
  solution: readonly boolean[]
): { rowClues: Clue[]; colClues: Clue[] } {
  const rowClues: Clue[] = [];
  const colClues: Clue[] = [];

  for (let i = 0; i < size; i += 1) {
    const row: boolean[] = [];
    const col: boolean[] = [];
    for (let j = 0; j < size; j += 1) {
      row.push(solution[i * size + j] === true);
      col.push(solution[j * size + i] === true);
    }
    rowClues.push(cluesFor(row));
    colClues.push(cluesFor(col));
  }

  return { rowClues, colClues };
}

export interface Board {
  size: number;
  rowClues: Clue[];
  colClues: Clue[];
}

/**
 * Applies `solveLine` to every row and column until nothing new comes out.
 *
 * What comes back is everything the clues force, and no more. If it still holds
 * an UNKNOWN, the puzzle cannot be finished by line logic alone — which is the
 * generator's cue to throw it away, because the alternative is asking the
 * player to guess.
 */
export function propagate(board: Board, start?: readonly Mark[]): Mark[] | null {
  const { size, rowClues, colClues } = board;
  const marks: Mark[] =
    start === undefined ? new Array<Mark>(size * size).fill(UNKNOWN) : [...start];

  let changed = true;
  while (changed) {
    changed = false;

    for (let r = 0; r < size; r += 1) {
      const line: Mark[] = [];
      for (let c = 0; c < size; c += 1) line.push(marks[r * size + c] ?? UNKNOWN);

      const solved = solveLine(rowClues[r] ?? [], line);
      if (solved === null) return null;

      for (let c = 0; c < size; c += 1) {
        const next = solved[c] ?? UNKNOWN;
        if (next !== marks[r * size + c]) {
          marks[r * size + c] = next;
          changed = true;
        }
      }
    }

    for (let c = 0; c < size; c += 1) {
      const line: Mark[] = [];
      for (let r = 0; r < size; r += 1) line.push(marks[r * size + c] ?? UNKNOWN);

      const solved = solveLine(colClues[c] ?? [], line);
      if (solved === null) return null;

      for (let r = 0; r < size; r += 1) {
        const next = solved[r] ?? UNKNOWN;
        if (next !== marks[r * size + c]) {
          marks[r * size + c] = next;
          changed = true;
        }
      }
    }
  }

  return marks;
}

/** True when the clues alone determine the picture, with no guessing anywhere. */
export function isSolvableByLines(board: Board): boolean {
  const solved = propagate(board);
  return solved !== null && !solved.includes(UNKNOWN);
}
