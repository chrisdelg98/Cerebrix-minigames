import { type Difficulty, type GameEngine } from '@core/contract';

import { DEPTH, landing, machineMove, openColumns, other, ranked, winningLine } from './search';
import {
  type Board,
  type ConnectFourConfig,
  type ConnectFourMove,
  type ConnectFourState,
  COLS,
  ROWS,
} from './types';

/** El jugador siempre es rojo y siempre arranca. La máquina es amarilla. */
const PLAYER = 'red';
const MACHINE = 'yellow';

/**
 * Los cinco niveles son la misma búsqueda con distinta disciplina.
 *
 * Todos miran cinco jugadas —ver `DEPTH` para por qué ese es el techo útil— y
 * lo que cambia es cuánto se permite la máquina no jugar lo que encontró.
 *
 * El nivel 5 vale 1: **nunca se equivoca**. Es lo que Conecta 4 puede dar y el
 * tres en línea no, porque allá una máquina impecable era imposible de ganar.
 */
const CONFIGS: Record<Difficulty, number> = { 1: 0.35, 2: 0.55, 3: 0.72, 4: 0.86, 5: 1 };

export const DUO_MODE = 'duo';

const empty = (): Board => Array.from({ length: COLS * ROWS }, () => null);

export const connectFourEngine: GameEngine<ConnectFourState, ConnectFourMove, ConnectFourConfig> = {
  getDifficultyConfig(difficulty, mode) {
    return { sharpness: CONFIGS[difficulty], vsMachine: mode !== DUO_MODE };
  },

  createInitialState(config, seed) {
    return {
      board: empty(),
      turn: PLAYER,
      line: null,
      last: null,
      config,
      seed: seed ?? String(Date.now()),
      plies: 0,
    };
  },

  validate(state, move) {
    if (state.line !== null) return { ok: false, reason: 'La partida ya terminó.' };
    if (landing(state.board, move.column) < 0) {
      return { ok: false, reason: 'Esa columna está llena.' };
    }
    return { ok: true };
  },

  /**
   * Soltar la ficha y, contra la máquina, su respuesta — en una sola jugada.
   *
   * Juntas y no en dos pasos porque el contrato exige pureza: si la respuesta
   * llegara después, por un efecto o un temporizador, deshacer devolvería a una
   * posición a medias donde le toca a un rival que no existe. Encerradas acá,
   * deshacer saca las DOS fichas y vuelve a donde el jugador estaba decidiendo.
   */
  applyMove(state, move) {
    const board = state.board.slice();
    const row = landing(board, move.column);
    const cell = row * COLS + move.column;
    board[cell] = state.turn;

    const line = winningLine(board);
    if (line !== null || openColumns(board).length === 0) {
      return { ...state, board, line, last: cell, turn: other(state.turn) };
    }

    if (!state.config.vsMachine) {
      return { ...state, board, line: null, last: cell, turn: other(state.turn) };
    }

    const reply = machineMove(board, MACHINE, state.config, state.seed, state.plies);
    if (reply < 0) return { ...state, board, line: null, last: cell, turn: MACHINE };

    const replyRow = landing(board, reply);
    const replyCell = replyRow * COLS + reply;
    board[replyCell] = MACHINE;

    return {
      ...state,
      board,
      line: winningLine(board),
      last: replyCell,
      turn: PLAYER,
      plies: state.plies + 1,
    };
  },

  checkStatus(state) {
    const { line } = state;

    if (line !== null) {
      const winner = state.board[line[0] ?? 0];

      /* Contra la máquina el shell ya sabe tutear. Entre dos personas no sabe
         cuál de las dos mira la pantalla, así que el nombre lo pone el juego. */
      if (!state.config.vsMachine) {
        return {
          kind: 'won',
          winner: winner === PLAYER ? 'Ganan las rojas' : 'Ganan las amarillas',
        };
      }
      if (winner === PLAYER) return { kind: 'won' };
      return { kind: 'lost', reason: 'La máquina alineó cuatro.' };
    }

    if (openColumns(state.board).length === 0) {
      return { kind: 'draw', reason: 'Tablero lleno y ninguna línea de cuatro.' };
    }

    return { kind: 'playing' };
  },

  /**
   * Cuánto queda de tablero.
   *
   * En un juego de dos lados no existe "cuánto te falta para ganar" — podés
   * ganar en la séptima ficha o no ganar nunca. Lo que sí avanza siempre es el
   * tablero llenándose.
   */
  getProgress(state) {
    return (COLS * ROWS - state.board.filter((cell) => cell === null).length) / (COLS * ROWS);
  },

  /** La mejor columna, mirada a fondo: una pista es la jugada que vos no viste. */
  getHint(state) {
    if (state.line !== null) return null;
    const best = ranked(state.board, state.turn, DEPTH)[0];
    if (best === undefined) return null;

    const row = landing(state.board, best.column);
    return {
      cells: [{ row, col: best.column }],
      message: `Probá la columna ${String(best.column + 1)}.`,
    };
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as ConnectFourState;
  },
};
