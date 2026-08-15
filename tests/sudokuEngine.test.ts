import { describe, expect, it } from 'vitest';

import {
  CELLS,
  boxOf,
  colOf,
  conflictsIn,
  gridToString,
  notesOf,
  parseGrid,
  rowOf,
} from '@games/sudoku/engine/grid';
import { sudokuEngine } from '@games/sudoku/engine/sudokuEngine';
import { type SudokuState } from '@games/sudoku/engine/types';

import puzzles1 from '../src/games/sudoku/data/puzzles-1.json';
import puzzles2 from '../src/games/sudoku/data/puzzles-2.json';
import puzzles3 from '../src/games/sudoku/data/puzzles-3.json';
import puzzles4 from '../src/games/sudoku/data/puzzles-4.json';
import puzzles5 from '../src/games/sudoku/data/puzzles-5.json';

/** No DOM, no renderer — the reason `render` was kept out of the engine. */

const FILES = [puzzles1, puzzles2, puzzles3, puzzles4, puzzles5];

async function fresh(difficulty: 1 | 2 | 3 | 4 | 5, seed = 'test'): Promise<SudokuState> {
  return sudokuEngine.createInitialState(sudokuEngine.getDifficultyConfig(difficulty), seed);
}

/* ─────────────────────────── The puzzles themselves ─────────────────────────── */

describe('the shipped puzzles', () => {
  it('ships at least 50 per difficulty', () => {
    for (const file of FILES) expect(file.puzzles.length).toBeGreaterThanOrEqual(50);
  });

  it('holds a valid, complete solution for every puzzle', () => {
    for (const file of FILES) {
      for (const { s } of file.puzzles) {
        const solution = parseGrid(s);
        expect(solution.every((value) => value >= 1 && value <= 9)).toBe(true);
        // A solution with a repeat inside a row, column or box is not one.
        expect(conflictsIn(asState(solution)).size).toBe(0);
      }
    }
  });

  it('never contradicts its own solution in the clues it gives', () => {
    for (const file of FILES) {
      for (const { p, s } of file.puzzles) {
        const puzzle = parseGrid(p);
        const solution = parseGrid(s);
        for (let i = 0; i < CELLS; i++) {
          if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i]);
        }
      }
    }
  });

  it('has exactly one solution per puzzle', () => {
    // Uniqueness is the property that makes a Sudoku a Sudoku. Without it a
    // player can reach a full, consistent grid the game refuses to accept, with
    // no way to understand why. The generator verifies it; this re-verifies
    // what actually shipped.
    for (const file of FILES) {
      for (const { p } of file.puzzles) {
        expect(countSolutions(parseGrid(p))).toBe(1);
      }
    }
  });

  it('gets harder by giving fewer clues', () => {
    const averages = FILES.map(
      (file) => file.puzzles.reduce((total, p) => total + p.c, 0) / file.puzzles.length
    );
    for (let i = 1; i < averages.length; i++) {
      expect(averages[i]!).toBeLessThan(averages[i - 1]!);
    }
  });
});

/* ─────────────────────────── Geometry ─────────────────────────── */

describe('grid geometry', () => {
  it('locates a cell by row, column and box', () => {
    expect([rowOf(0), colOf(0), boxOf(0)]).toEqual([0, 0, 0]);
    expect([rowOf(80), colOf(80), boxOf(80)]).toEqual([8, 8, 8]);
    expect([rowOf(40), colOf(40), boxOf(40)]).toEqual([4, 4, 4]);
    expect(boxOf(3)).toBe(1);
    expect(boxOf(27)).toBe(3);
  });

  it('finds conflicts in a row, a column and a box alike', () => {
    const values = new Array<number>(CELLS).fill(0);
    values[0] = 5;
    values[8] = 5; // same row
    expect(conflictsIn(asState(values))).toEqual(new Set([0, 8]));

    values[8] = 0;
    values[72] = 5; // same column
    expect(conflictsIn(asState(values))).toEqual(new Set([0, 72]));

    values[72] = 0;
    values[10] = 5; // same box
    expect(conflictsIn(asState(values))).toEqual(new Set([0, 10]));
  });

  it('reports no conflict for an empty board', () => {
    expect(conflictsIn(asState(new Array<number>(CELLS).fill(0))).size).toBe(0);
  });
});

/* ─────────────────────────── The engine ─────────────────────────── */

describe('sudoku engine', () => {
  it('deals a board matching the difficulty asked for', async () => {
    const easy = await fresh(1);
    const expert = await fresh(5);

    const clues = (state: SudokuState) => state.given.filter(Boolean).length;
    expect(clues(easy)).toBeGreaterThan(clues(expert));
    expect(easy.values.length).toBe(CELLS);
  });

  it('deals the same board for the same seed', async () => {
    const a = await fresh(3, 'lunes');
    const b = await fresh(3, 'lunes');
    const c = await fresh(3, 'martes');

    expect(gridToString(a.values)).toBe(gridToString(b.values));
    expect(gridToString(a.values)).not.toBe(gridToString(c.values));
  });

  it('never mutates the state it is given', async () => {
    const before = await fresh(1);
    const snapshot = structuredClone(before);
    const empty = before.given.indexOf(false);

    const after = sudokuEngine.applyMove(before, { kind: 'set', index: empty, value: 4 });

    expect(before).toEqual(snapshot);
    expect(after).not.toBe(before);
  });

  it('refuses to edit a clue', async () => {
    const state = await fresh(1);
    const clue = state.given.indexOf(true);

    const verdict = sudokuEngine.validate(state, { kind: 'set', index: clue, value: 1 });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/pista/);
  });

  it('ALLOWS a digit that clashes with a peer, and marks it instead', async () => {
    // Sudoku is deduction. Blocking a clashing digit tells the player it is
    // wrong for free, which is the game doing their work.
    const state = await fresh(1);
    const clue = state.given.indexOf(true);
    const target = state.given.findIndex(
      (given, i) => !given && (rowOf(i) === rowOf(clue) || colOf(i) === colOf(clue))
    );
    const clash = state.values[clue] ?? 1;

    expect(sudokuEngine.validate(state, { kind: 'set', index: target, value: clash }).ok).toBe(
      true
    );

    const after = sudokuEngine.applyMove(state, { kind: 'set', index: target, value: clash });
    expect(conflictsIn(after).has(target)).toBe(true);
  });

  it('clears the digit when the same one is written twice', async () => {
    const state = await fresh(1);
    const empty = state.given.indexOf(false);

    const once = sudokuEngine.applyMove(state, { kind: 'set', index: empty, value: 7 });
    const twice = sudokuEngine.applyMove(once, { kind: 'set', index: empty, value: 7 });

    expect(once.values[empty]).toBe(7);
    expect(twice.values[empty]).toBe(0);
  });

  it('retires a pencil mark from every peer when the digit is placed', async () => {
    const state = await fresh(1);
    const empty = state.given.indexOf(false);
    const peer = state.given.findIndex(
      (given, i) => !given && i !== empty && rowOf(i) === rowOf(empty)
    );

    const noted = sudokuEngine.applyMove(state, { kind: 'note', index: peer, value: 6 });
    expect(notesOf(noted.notes[peer] ?? 0)).toContain(6);

    const placed = sudokuEngine.applyMove(noted, { kind: 'set', index: empty, value: 6 });
    expect(notesOf(placed.notes[peer] ?? 0)).not.toContain(6);
  });

  it('keeps notes off a cell that already holds a digit', async () => {
    const state = await fresh(1);
    const clue = state.given.indexOf(true);

    const after = sudokuEngine.applyMove(state, { kind: 'note', index: clue, value: 3 });
    expect(after.notes[clue]).toBe(0);
  });

  it('erases the digit and the notes together', async () => {
    const state = await fresh(1);
    const empty = state.given.indexOf(false);

    const filled = sudokuEngine.applyMove(state, { kind: 'set', index: empty, value: 2 });
    const erased = sudokuEngine.applyMove(filled, { kind: 'erase', index: empty });

    expect(erased.values[empty]).toBe(0);
    expect(erased.notes[empty]).toBe(0);
  });

  it('is won only when the board is both full and correct', async () => {
    const state = await fresh(1);
    expect(sudokuEngine.checkStatus(state)).toEqual({ kind: 'playing' });

    // Full but wrong: two digits swapped. Completeness is not correctness.
    const wrong: SudokuState = { ...state, values: [...state.solution] };
    const a = wrong.values[0] ?? 1;
    wrong.values[0] = wrong.values[1] ?? 1;
    wrong.values[1] = a;
    expect(sudokuEngine.checkStatus(wrong)).toEqual({ kind: 'playing' });

    expect(sudokuEngine.checkStatus({ ...state, values: [...state.solution] })).toEqual({
      kind: 'won',
    });
  });

  it('reports progress from the clues up to the full board', async () => {
    const state = await fresh(1);
    expect(sudokuEngine.getProgress(state)).toBeGreaterThan(0);
    expect(sudokuEngine.getProgress(state)).toBeLessThan(1);
    expect(sudokuEngine.getProgress({ ...state, values: [...state.solution] })).toBe(1);
  });

  it('hints the first cell that is empty or wrong', async () => {
    const state = await fresh(1);
    const hint = sudokuEngine.getHint?.(state);

    expect(hint).not.toBeNull();
    const index = (hint?.cells[0]?.row ?? 0) * 9 + (hint?.cells[0]?.col ?? 0);
    expect(state.values[index]).not.toBe(state.solution[index]);
    expect(hint?.message).toContain(String(state.solution[index]));

    expect(sudokuEngine.getHint?.({ ...state, values: [...state.solution] })).toBeNull();
  });

  it('round-trips through serialize/deserialize, notes included', async () => {
    const state = await fresh(4);
    const empty = state.given.indexOf(false);

    const played = sudokuEngine.applyMove(
      sudokuEngine.applyMove(state, { kind: 'note', index: empty, value: 3 }),
      { kind: 'note', index: empty, value: 8 }
    );

    const restored = sudokuEngine.deserialize(sudokuEngine.serialize(played), 1);
    expect(restored).toEqual(played);
    expect(notesOf(restored.notes[empty] ?? 0)).toEqual([3, 8]);
  });

  it('refuses a state saved by a newer build instead of guessing', async () => {
    const raw = sudokuEngine.serialize(await fresh(1));

    expect(() => sudokuEngine.deserialize(raw, 99)).toThrow(/newer version/);
    expect(() => sudokuEngine.deserialize('{"v":1}', 1)).toThrow(/Corrupt/);
  });
});

/* ─────────────────────────── Helpers ─────────────────────────── */

function asState(values: number[]): SudokuState {
  return {
    values,
    given: values.map(() => false),
    notes: new Array<number>(CELLS).fill(0),
    solution: values,
  };
}

/** An independent solver, so uniqueness is not verified by the code that dug the holes. */
function countSolutions(grid: number[], limit = 2): number {
  let best = -1;
  let bestCandidates: number[] | null = null;

  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) continue;
    const candidates: number[] = [];
    for (let v = 1; v <= 9; v++) {
      if (!hasPeerWith(grid, i, v)) candidates.push(v);
    }
    if (candidates.length === 0) return 0;
    if (bestCandidates === null || candidates.length < bestCandidates.length) {
      best = i;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }

  if (best === -1) return 1;

  let found = 0;
  for (const value of bestCandidates ?? []) {
    grid[best] = value;
    found += countSolutions(grid, limit - found);
    grid[best] = 0;
    if (found >= limit) break;
  }
  return found;
}

function hasPeerWith(grid: number[], index: number, value: number): boolean {
  for (let k = 0; k < CELLS; k++) {
    if (k === index) continue;
    if (grid[k] !== value) continue;
    if (rowOf(k) === rowOf(index) || colOf(k) === colOf(index) || boxOf(k) === boxOf(index)) {
      return true;
    }
  }
  return false;
}
