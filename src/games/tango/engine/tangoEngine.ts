import { type Difficulty, type GameEngine } from '@core/contract';

import { nextStep } from './deduce';
import { generatePuzzle } from './generate';
import {
  EMPTY,
  SIZE,
  type TangoConfig,
  type TangoMove,
  type TangoState,
  type Value,
} from './types';

/*
 * Los tres primeros niveles se resuelven leyendo el tablero: cada paso sale de
 * una regla que se ve. Los dos últimos admiten razonar por contradicción, que
 * es la diferencia real entre "fácil" y "hay que pensarlo".
 */
const CONFIGS: Record<Difficulty, TangoConfig> = {
  1: { signs: 12, allowContradiction: false, keep: 16 },
  2: { signs: 10, allowContradiction: false, keep: 12 },
  3: { signs: 7, allowContradiction: false, keep: 9 },
  4: { signs: 5, allowContradiction: true, keep: 0 },
  5: { signs: 3, allowContradiction: true, keep: 0 },
};

export const tangoEngine: GameEngine<TangoState, TangoMove, TangoConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    return generatePuzzle(config, seed);
  },

  validate(state, move) {
    if (move.index < 0 || move.index >= state.values.length) {
      return { ok: false, reason: 'Esa casilla no existe.' };
    }
    if (state.given[move.index] === true) {
      return {
        ok: false,
        reason: 'Esa casilla venía con el tablero.',
        cells: [cellOf(move.index)],
      };
    }
    return { ok: true };
  },

  applyMove(state, move) {
    const values = [...state.values];
    values[move.index] = move.value;
    return { ...state, values };
  },

  /*
   * Compared against the solution rather than re-checked against the rules:
   * the puzzle is generated with uniqueness verified, so the only board that
   * satisfies everything IS this one. No way to lose.
   */
  checkStatus(state) {
    return state.values.every((value, i) => value === state.solution[i])
      ? { kind: 'won' }
      : { kind: 'playing' };
  },

  getProgress(state) {
    const filled = state.values.filter((value) => value !== EMPTY).length;
    return filled / state.values.length;
  },

  /**
   * No dice qué va: dice POR QUÉ va.
   *
   * Es el mismo motor con el que se generó el tablero, así que la pista es
   * literalmente el próximo paso que el jugador podría haber encontrado, con la
   * regla que lo obliga. Lo que está mal se descarta antes de razonar: si no,
   * la deducción sale de un tablero roto justo cuando más falta hace.
   */
  getHint(state) {
    const trusted = state.values.map((value, i) =>
      value === state.solution[i] ? value : (EMPTY as Value)
    );

    const step = nextStep(trusted, state.constraints, true);
    if (step === null) return null;

    const { row, col } = cellOf(step.index);
    return { cells: [{ row, col }], message: step.why };
  },

  serialize(state) {
    return JSON.stringify({
      values: state.values.join(''),
      given: state.given.map((yes) => (yes ? '1' : '0')).join(''),
      solution: state.solution.join(''),
      constraints: state.constraints,
    });
  },

  deserialize(raw) {
    const saved = JSON.parse(raw) as {
      values: string;
      given: string;
      solution: string;
      constraints: TangoState['constraints'];
    };
    return {
      values: [...saved.values].map((char) => Number(char) as Value),
      given: [...saved.given].map((char) => char === '1'),
      solution: [...saved.solution].map((char) => Number(char) as Value),
      constraints: saved.constraints,
    };
  },
};

function cellOf(index: number): { row: number; col: number } {
  return { row: Math.floor(index / SIZE), col: index % SIZE };
}
