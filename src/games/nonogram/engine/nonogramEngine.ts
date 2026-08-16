import { type Difficulty, type GameEngine, type Hint } from '@core/contract';

import { generatePuzzle } from './generate';
import { cluesForGrid, propagate } from './lines';
import {
  CROSSED,
  FILLED,
  UNKNOWN,
  type Mark,
  type NonogramConfig,
  type NonogramMove,
  type NonogramState,
} from './types';

/**
 * Difficulty is board size first and density second.
 *
 * Density runs the other way from what you would guess: a denser picture has
 * longer runs and fewer numbers per line, which gives more to hold on to. The
 * sparse boards are the hard ones.
 */
const CONFIGS: Record<Difficulty, NonogramConfig> = {
  1: { size: 3, density: 0.6 },
  2: { size: 5, density: 0.6 },
  3: { size: 8, density: 0.58 },
  4: { size: 10, density: 0.55 },
  5: { size: 12, density: 0.52 },
};

function isWrong(state: NonogramState, index: number): boolean {
  return state.marks[index] === FILLED && state.solution[index] !== true;
}

export const nonogramEngine: GameEngine<NonogramState, NonogramMove, NonogramConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const puzzle = generatePuzzle(config, seed);
    return {
      size: puzzle.size,
      solution: puzzle.solution,
      marks: new Array<Mark>(puzzle.size * puzzle.size).fill(UNKNOWN),
      rowClues: puzzle.rowClues,
      colClues: puzzle.colClues,
    };
  },

  validate(state, move) {
    const inside = move.indices.filter((i) => i >= 0 && i < state.marks.length);
    if (inside.length === 0) return { ok: false, reason: 'Esa casilla no existe.' };
    if (inside.every((i) => state.marks[i] === move.mark)) {
      return { ok: false, reason: 'Esas casillas ya están así.' };
    }
    return { ok: true };
  },

  applyMove(state, move) {
    const marks = [...state.marks];
    for (const index of move.indices) {
      if (index >= 0 && index < marks.length) marks[index] = move.mark;
    }
    return { ...state, marks };
  },

  /*
   * There is no way to lose. A wrong square is not punished and not flagged
   * either — finding out that a line does not add up, and walking it back, is
   * the game. Marking it red would just be the answer, one square at a time.
   */
  checkStatus(state) {
    for (let i = 0; i < state.solution.length; i += 1) {
      const painted = state.solution[i] === true;
      if (painted !== (state.marks[i] === FILLED)) return { kind: 'playing' };
    }
    return { kind: 'won' };
  },

  getProgress(state) {
    let target = 0;
    let done = 0;
    for (let i = 0; i < state.solution.length; i += 1) {
      if (state.solution[i] !== true) continue;
      target += 1;
      if (state.marks[i] === FILLED) done += 1;
    }
    return target === 0 ? 1 : done / target;
  },

  /**
   * Deduces from what the player has right, then points at one square the clues
   * now force — so the hint is a step of the same reasoning the player is doing,
   * not a peek at the answer.
   *
   * Wrong marks are dropped before deducing. Feeding them in would propagate a
   * contradiction and the hint would come back empty exactly when it is needed
   * most, which is the moment someone is stuck because they got one wrong.
   */
  getHint(state): Hint | null {
    const trusted: Mark[] = state.marks.map((mark, i) => {
      const painted = state.solution[i] === true;
      if (mark === FILLED && painted) return FILLED;
      if (mark === CROSSED && !painted) return CROSSED;
      return UNKNOWN;
    });

    const forced = propagate(
      { size: state.size, rowClues: state.rowClues, colClues: state.colClues },
      trusted
    );
    if (forced === null) return null;

    for (let i = 0; i < forced.length; i += 1) {
      if (trusted[i] !== UNKNOWN || forced[i] === UNKNOWN) continue;

      const row = Math.floor(i / state.size);
      const col = i % state.size;
      const message =
        forced[i] === FILLED
          ? `Fila ${String(row + 1)}, columna ${String(col + 1)}: esa casilla va pintada, y las pistas ya alcanzan para saberlo.`
          : `Fila ${String(row + 1)}, columna ${String(col + 1)}: esa casilla queda vacía, y las pistas ya alcanzan para saberlo.`;

      return { cells: [{ row, col }], message };
    }

    // Nothing left to deduce: either it is finished, or the only thing wrong is
    // a square the player painted that should not be.
    const mistake = state.marks.findIndex((_, i) => isWrong(state, i));
    if (mistake === -1) return null;

    return {
      cells: [{ row: Math.floor(mistake / state.size), col: mistake % state.size }],
      message: 'Esa casilla está pintada de más. Sacala y las pistas vuelven a cerrar.',
    };
  },

  serialize(state) {
    return JSON.stringify({
      size: state.size,
      // Clues are not stored: they follow from the picture, and two copies of
      // the same fact in one save is one copy too many.
      solution: state.solution.map((painted) => (painted ? '1' : '0')).join(''),
      marks: state.marks.join(''),
    });
  },

  deserialize(raw) {
    const saved = JSON.parse(raw) as { size: number; solution: string; marks: string };
    const solution = [...saved.solution].map((char) => char === '1');
    const marks = [...saved.marks].map((char) => (Number(char) as Mark) ?? UNKNOWN);

    return { size: saved.size, solution, marks, ...cluesForGrid(saved.size, solution) };
  },
};
