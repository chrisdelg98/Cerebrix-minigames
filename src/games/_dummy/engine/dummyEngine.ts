import {
  type Difficulty,
  type GameEngine,
  type GameStatus,
  type Hint,
  type ValidationResult,
} from '@core/contract';

import { type DummyConfig, type DummyMove, type DummyState } from './types';

/**
 * The minimum honest implementation of the contract: mark every tile and you
 * win. It exists to prove the shell runs a game it knows nothing about, and it
 * is deliberately kept when real games arrive — it is a living test
 * (docs/GAME_CONTRACT.md §7).
 *
 * Zero imports of React, CSS or /design. It runs in a Web Worker as-is.
 */

const STATE_VERSION = 1;

const TILES_BY_DIFFICULTY: Readonly<Record<Difficulty, number>> = {
  1: 3,
  2: 4,
  3: 6,
  4: 8,
  5: 9,
};

interface SerializedDummy {
  v: number;
  tiles: boolean[];
}

export const dummyEngine: GameEngine<DummyState, DummyMove, DummyConfig> = {
  getDifficultyConfig(difficulty) {
    return { tiles: TILES_BY_DIFFICULTY[difficulty] };
  },

  createInitialState(config) {
    return { tiles: Array.from({ length: config.tiles }, () => false) };
  },

  validate(state, move): ValidationResult {
    if (move.kind === 'winNow') return { ok: true };

    const tile = state.tiles[move.index];
    if (tile === undefined) {
      return { ok: false, reason: 'Esa casilla no existe.' };
    }
    if (tile) {
      return {
        ok: false,
        reason: 'Esa casilla ya está marcada.',
        cells: [{ row: 0, col: move.index }],
      };
    }
    return { ok: true };
  },

  // Pure: a new array every time. The shell's undo stack depends on it.
  applyMove(state, move) {
    if (move.kind === 'winNow') {
      return { tiles: state.tiles.map(() => true) };
    }
    return { tiles: state.tiles.map((tile, i) => (i === move.index ? true : tile)) };
  },

  checkStatus(state): GameStatus {
    return state.tiles.every(Boolean) ? { kind: 'won' } : { kind: 'playing' };
  },

  getProgress(state) {
    if (state.tiles.length === 0) return 1;
    return state.tiles.filter(Boolean).length / state.tiles.length;
  },

  getHint(state): Hint | null {
    const index = state.tiles.findIndex((tile) => !tile);
    if (index === -1) return null;
    return { cells: [{ row: 0, col: index }], message: `Probá la casilla ${index + 1}.` };
  },

  serialize(state) {
    return JSON.stringify({ v: STATE_VERSION, tiles: state.tiles } satisfies SerializedDummy);
  },

  deserialize(raw, fromVersion) {
    if (fromVersion > STATE_VERSION) {
      throw new Error(`Saved with a newer version (${fromVersion}) than this build understands.`);
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isSerialized(parsed)) {
      throw new Error('Corrupt saved state for _dummy.');
    }
    return { tiles: [...parsed.tiles] };
  },
};

function isSerialized(value: unknown): value is SerializedDummy {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<SerializedDummy>;
  return Array.isArray(candidate.tiles) && candidate.tiles.every((t) => typeof t === 'boolean');
}
