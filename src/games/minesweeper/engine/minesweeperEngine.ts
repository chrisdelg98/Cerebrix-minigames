import {
  type Difficulty,
  type GameEngine,
  type GameStatus,
  type Hint,
  type ValidationResult,
} from '@core/contract';

import { MINE, floodReveal, isCleared, neighbours, seedMines } from './board';
import { type MinesweeperConfig, type MinesweeperMove, type MinesweeperState } from './types';

/**
 * Minesweeper, as pure logic. Zero imports of React, CSS or /design.
 *
 * This is the game the architecture was meant to be tested against: the board
 * is not square, most of the state is hidden, there is a way to LOSE, and the
 * player has a second interaction (the flag) that Sudoku never needed.
 */

const STATE_VERSION = 1;

/**
 * Column counts stay narrow on purpose. The classic 30-wide expert board is a
 * desktop artefact; on a phone it makes every cell smaller than a fingertip,
 * and this is a game designed to be played with one hand.
 */
const BOARDS: Readonly<Record<Difficulty, MinesweeperConfig>> = {
  1: { cols: 8, rows: 8, mines: 10 },
  2: { cols: 9, rows: 11, mines: 18 },
  3: { cols: 10, rows: 14, mines: 30 },
  4: { cols: 12, rows: 16, mines: 50 },
  5: { cols: 14, rows: 18, mines: 78 },
};

interface SerializedMinesweeper {
  v: number;
  cols: number;
  rows: number;
  mines: number;
  values: string;
  revealed: string;
  flagged: string;
  seeded: boolean;
  detonated: number;
  seed: string;
}

const bits = (flags: readonly boolean[]): string => flags.map((f) => (f ? '1' : '0')).join('');
const unbits = (raw: string): boolean[] => [...raw].map((c) => c === '1');

export const minesweeperEngine: GameEngine<MinesweeperState, MinesweeperMove, MinesweeperConfig> = {
  getDifficultyConfig(difficulty) {
    return BOARDS[difficulty];
  },

  createInitialState(config, seed) {
    const total = config.cols * config.rows;
    return {
      cols: config.cols,
      rows: config.rows,
      mines: config.mines,
      // Empty until the first reveal — the opening click decides the board.
      values: new Array<number>(total).fill(0),
      revealed: new Array<boolean>(total).fill(false),
      flagged: new Array<boolean>(total).fill(false),
      seeded: false,
      detonated: -1,
      seed: seed ?? Math.random().toString(36).slice(2),
    };
  },

  validate(state, move): ValidationResult {
    const total = state.cols * state.rows;
    if (move.index < 0 || move.index >= total) {
      return { ok: false, reason: 'Esa casilla no existe.' };
    }

    const at = { row: Math.floor(move.index / state.cols), col: move.index % state.cols };

    if (move.kind === 'flag') {
      // A revealed cell has nothing left to guess about.
      if (state.revealed[move.index] === true) {
        return { ok: false, reason: 'Esa casilla ya está descubierta.', cells: [at] };
      }
      return { ok: true };
    }

    if (move.kind === 'reveal') {
      if (state.flagged[move.index] === true) {
        return { ok: false, reason: 'Sacá la bandera antes de descubrirla.', cells: [at] };
      }
      if (state.revealed[move.index] === true) {
        return { ok: false, reason: 'Esa casilla ya está descubierta.', cells: [at] };
      }
      return { ok: true };
    }

    // Chording only means something on a revealed number.
    if (state.revealed[move.index] !== true || (state.values[move.index] ?? 0) <= 0) {
      return {
        ok: false,
        reason: 'Tocá un número descubierto para despejar alrededor.',
        cells: [at],
      };
    }
    return { ok: true };
  },

  applyMove(state, move) {
    if (move.kind === 'flag') {
      const flagged = [...state.flagged];
      flagged[move.index] = flagged[move.index] !== true;
      return { ...state, flagged };
    }

    // The first reveal is what lays the mines, and it is laid around the click.
    const base = state.seeded ? state : seedMines(state, move.index);
    const revealed = [...base.revealed];

    const targets =
      move.kind === 'reveal'
        ? [move.index]
        : // Chording: only when the flags around the number add up to it.
          neighbours(move.index, base.cols, base.rows).filter((n) => base.flagged[n] !== true);

    if (move.kind === 'chord') {
      const around = neighbours(move.index, base.cols, base.rows);
      const flags = around.filter((n) => base.flagged[n] === true).length;
      if (flags !== base.values[move.index]) return state;
    }

    for (const target of targets) {
      if (base.flagged[target] === true) continue;

      if (base.values[target] === MINE) {
        // Losing reveals the whole minefield: the player gets to see what it was.
        const all = [...revealed];
        for (let i = 0; i < base.values.length; i++) {
          if (base.values[i] === MINE) all[i] = true;
        }
        return { ...base, revealed: all, detonated: target };
      }

      floodReveal(base.values, revealed, base.flagged, target, base.cols, base.rows);
    }

    return { ...base, revealed };
  },

  checkStatus(state): GameStatus {
    if (state.detonated >= 0) return { kind: 'lost', reason: 'Tocaste una mina.' };
    if (isCleared(state)) return { kind: 'won' };
    return { kind: 'playing' };
  },

  getProgress(state) {
    const safe = state.cols * state.rows - state.mines;
    if (safe <= 0) return 0;
    const opened = state.revealed.filter((r, i) => r && state.values[i] !== MINE).length;
    return opened / safe;
  },

  getHint(state): Hint | null {
    if (!state.seeded) {
      return {
        cells: [{ row: 0, col: 0 }],
        message: 'Empezá por cualquier casilla: la primera nunca es mina.',
      };
    }
    for (let i = 0; i < state.values.length; i++) {
      if (state.values[i] !== MINE && state.revealed[i] !== true && state.flagged[i] !== true) {
        return {
          cells: [{ row: Math.floor(i / state.cols), col: i % state.cols }],
          message: `Fila ${String(Math.floor(i / state.cols) + 1)}, columna ${String((i % state.cols) + 1)}: no hay mina.`,
        };
      }
    }
    return null;
  },

  serialize(state) {
    return JSON.stringify({
      v: STATE_VERSION,
      cols: state.cols,
      rows: state.rows,
      mines: state.mines,
      // Base 36 keeps -1 as "-1" and 0-8 as one character each.
      values: state.values.map((v) => (v === MINE ? '*' : String(v))).join(''),
      revealed: bits(state.revealed),
      flagged: bits(state.flagged),
      seeded: state.seeded,
      detonated: state.detonated,
      seed: state.seed,
    } satisfies SerializedMinesweeper);
  },

  deserialize(raw, fromVersion) {
    if (fromVersion > STATE_VERSION) {
      throw new Error(`Saved with a newer version (${String(fromVersion)}) than this build reads.`);
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isSerialized(parsed)) throw new Error('Corrupt saved state for minesweeper.');

    const total = parsed.cols * parsed.rows;
    if (parsed.values.length !== total || parsed.revealed.length !== total) {
      throw new Error('Corrupt saved state for minesweeper.');
    }

    return {
      cols: parsed.cols,
      rows: parsed.rows,
      mines: parsed.mines,
      values: [...parsed.values].map((c) => (c === '*' ? MINE : Number(c))),
      revealed: unbits(parsed.revealed),
      flagged: unbits(parsed.flagged),
      seeded: parsed.seeded,
      detonated: parsed.detonated,
      seed: parsed.seed,
    };
  },
};

function isSerialized(value: unknown): value is SerializedMinesweeper {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Partial<SerializedMinesweeper>;
  return (
    typeof c.cols === 'number' &&
    typeof c.rows === 'number' &&
    typeof c.mines === 'number' &&
    typeof c.values === 'string' &&
    typeof c.revealed === 'string' &&
    typeof c.flagged === 'string' &&
    typeof c.seeded === 'boolean' &&
    typeof c.detonated === 'number' &&
    typeof c.seed === 'string'
  );
}
