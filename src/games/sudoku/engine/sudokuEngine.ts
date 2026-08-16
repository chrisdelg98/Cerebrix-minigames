import {
  type Difficulty,
  type GameEngine,
  type GameStatus,
  type Hint,
  type ValidationResult,
} from '@core/contract';

import {
  CELLS,
  PEERS,
  clearNote,
  gridToString,
  isComplete,
  isSolved,
  parseGrid,
  toggleNote,
} from './grid';
import { type GeneratedPuzzle } from './generate';
import { type SudokuConfig, type SudokuMove, type SudokuState } from './types';

/**
 * Sudoku, as pure logic. Zero imports of React, CSS or /design — it is testable
 * without a DOM and would run unchanged inside a Web Worker.
 */

const STATE_VERSION = 1;

interface PuzzleFile {
  difficulty: number;
  puzzles: { p: string; s: string; c: number }[];
}

/**
 * One JSON per difficulty, fetched only for the level being played. Loading all
 * five would put 46 kB of puzzles in the chunk to play one of them.
 */
const PUZZLE_FILES: Readonly<Record<number, () => Promise<{ default: PuzzleFile }>>> = {
  1: () => import('../data/puzzles-1.json'),
  2: () => import('../data/puzzles-2.json'),
  3: () => import('../data/puzzles-3.json'),
  4: () => import('../data/puzzles-4.json'),
  5: () => import('../data/puzzles-5.json'),
};

/**
 * Deterministic from the seed, so the same seed always yields the same board —
 * that is what a daily puzzle or a shared board will need in the backlog.
 */
function pickIndex(seed: string | undefined, total: number): number {
  if (seed === undefined) return Math.floor(Math.random() * total);

  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % total;
}

interface SerializedSudoku {
  v: number;
  values: string;
  given: string;
  notes: string;
  solution: string;
}

export const sudokuEngine: GameEngine<SudokuState, SudokuMove, SudokuConfig> = {
  getDifficultyConfig(difficulty: Difficulty): SudokuConfig {
    return { difficulty };
  },

  async createInitialState(config, seed) {
    // A freshly generated board first, the shipped ones as the safety net.
    const chosen =
      (await generateInWorker(config.difficulty, seed)) ?? (await fromFile(config, seed));

    const values = parseGrid(chosen.p);
    return {
      values,
      given: values.map((value) => value !== 0),
      notes: new Array<number>(CELLS).fill(0),
      solution: parseGrid(chosen.s),
    };
  },

  validate(state, move): ValidationResult {
    const cell = state.given[move.index];
    if (cell === undefined) {
      return { ok: false, reason: 'Esa celda no existe.' };
    }
    // A clue is part of the puzzle, not of the player's work.
    if (cell) {
      return {
        ok: false,
        reason: 'Esa celda es una pista del puzzle.',
        cells: [{ row: Math.floor(move.index / 9), col: move.index % 9 }],
      };
    }
    if (move.kind !== 'erase' && (move.value < 1 || move.value > 9)) {
      return { ok: false, reason: 'Solo van cifras del 1 al 9.' };
    }
    // A digit that clashes with a peer is NOT rejected here — see conflictsIn.
    return { ok: true };
  },

  applyMove(state, move) {
    const values = [...state.values];
    const notes = [...state.notes];

    switch (move.kind) {
      case 'set': {
        // Writing the same digit again clears it: one key does place and undo.
        const repeated = values[move.index] === move.value;
        values[move.index] = repeated ? 0 : move.value;
        notes[move.index] = 0;

        // Placing a digit retires that pencil mark from every peer. Doing it by
        // hand across 20 cells is the tedium the mode exists to avoid, and undo
        // restores whole states so nothing is lost by being helpful here.
        if (!repeated) {
          for (const peer of PEERS[move.index] ?? []) {
            notes[peer] = clearNote(notes[peer] ?? 0, move.value);
          }
        }
        break;
      }

      case 'note': {
        // Notes are meaningless on a cell that already holds a digit.
        if (values[move.index] === 0) {
          notes[move.index] = toggleNote(notes[move.index] ?? 0, move.value);
        }
        break;
      }

      case 'erase': {
        values[move.index] = 0;
        notes[move.index] = 0;
        break;
      }
    }

    return { ...state, values, notes };
  },

  checkStatus(state): GameStatus {
    // Complete is not the same as correct: conflicts are allowed to sit on the
    // board, so a full grid still has to match the one solution.
    if (isComplete(state) && isSolved(state)) return { kind: 'won' };
    return { kind: 'playing' };
  },

  getProgress(state) {
    const filled = state.values.filter((value) => value !== 0).length;
    return filled / CELLS;
  },

  getHint(state): Hint | null {
    // The first cell that is empty or wrong, and what belongs in it.
    for (let i = 0; i < CELLS; i++) {
      if (state.values[i] !== state.solution[i]) {
        return {
          cells: [{ row: Math.floor(i / 9), col: i % 9 }],
          message: `Fila ${String(Math.floor(i / 9) + 1)}, columna ${String((i % 9) + 1)}: va un ${String(state.solution[i])}.`,
        };
      }
    }
    return null;
  },

  serialize(state) {
    return JSON.stringify({
      v: STATE_VERSION,
      values: gridToString(state.values),
      given: state.given.map((g) => (g ? '1' : '0')).join(''),
      notes: state.notes.map((mask) => mask.toString(36)).join(','),
      solution: gridToString(state.solution),
    } satisfies SerializedSudoku);
  },

  deserialize(raw, fromVersion) {
    if (fromVersion > STATE_VERSION) {
      throw new Error(`Saved with a newer version (${String(fromVersion)}) than this build reads.`);
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isSerialized(parsed)) throw new Error('Corrupt saved state for sudoku.');

    const notes = parsed.notes.split(',').map((part) => Number.parseInt(part, 36) || 0);
    if (notes.length !== CELLS) throw new Error('Corrupt saved state for sudoku.');

    return {
      values: parseGrid(parsed.values),
      given: [...parsed.given].map((char) => char === '1'),
      notes,
      solution: parseGrid(parsed.solution),
    };
  },
};

/** The shipped puzzles: instant, and what everything falls back to. */
async function fromFile(config: SudokuConfig, seed: string | undefined): Promise<GeneratedPuzzle> {
  const load = PUZZLE_FILES[config.difficulty] ?? PUZZLE_FILES[3];
  if (!load) throw new Error(`No puzzles for difficulty ${String(config.difficulty)}`);

  const file = await load();
  const puzzles = file.default.puzzles;
  const chosen = puzzles[pickIndex(seed, puzzles.length)];
  if (!chosen) throw new Error('Empty puzzle file');
  return chosen;
}

/** How long to wait before giving up and dealing a shipped board instead. */
const WORKER_TIMEOUT_MS = 2500;

/**
 * Generates a board on another thread, and resolves to null on ANY problem —
 * no Worker in this environment (tests, old browsers), a thread that throws, or
 * one that takes too long. The caller then deals a shipped puzzle.
 *
 * Failing quietly is the point: an infinite supply of boards is not worth a
 * single screen where the player is told the generator had a bad day.
 */
function generateInWorker(
  difficulty: number,
  seed: string | undefined
): Promise<GeneratedPuzzle | null> {
  if (typeof Worker === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./generator.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }

    let settled = false;
    const finish = (puzzle: GeneratedPuzzle | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(puzzle);
    };

    const timer = setTimeout(() => {
      finish(null);
    }, WORKER_TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<{ ok: boolean; puzzle?: GeneratedPuzzle }>) => {
      finish(event.data.ok && event.data.puzzle ? event.data.puzzle : null);
    };
    worker.onerror = () => {
      finish(null);
    };

    worker.postMessage({
      difficulty,
      seed: seed ?? Math.random().toString(36).slice(2),
    });
  });
}

function isSerialized(value: unknown): value is SerializedSudoku {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SerializedSudoku>;
  return (
    typeof candidate.values === 'string' &&
    typeof candidate.given === 'string' &&
    typeof candidate.notes === 'string' &&
    typeof candidate.solution === 'string' &&
    candidate.values.length === CELLS &&
    candidate.given.length === CELLS &&
    candidate.solution.length === CELLS
  );
}
