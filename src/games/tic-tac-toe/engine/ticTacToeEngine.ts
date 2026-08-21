import { type GameEngine } from '@core/contract';
import { type Difficulty } from '@core/contract';

import { freeCells, machineMove, other, winningLine } from './machine';
import { type Board, type TicTacToeConfig, type TicTacToeMove, type TicTacToeState } from './types';

/** El jugador siempre es X y siempre arranca. La máquina es O. */
const PLAYER = 'x';
const MACHINE = 'o';

/**
 * Los cinco niveles son la misma máquina con distinta disciplina.
 *
 * `sharpness` es con qué frecuencia juega la mejor jugada que ya calculó, y
 * nunca vale 1: el tres en línea está resuelto, así que una máquina impecable
 * no se puede ganar nunca —lo mejor posible sería empatar— y el nivel más alto
 * sería el único que jamás daría un trofeo.
 *
 * Una sola perilla y no dos mecanismos. Medido sobre 300 partidas, la escala
 * sale pareja para los dos tipos de jugador, que es lo que ninguna versión
 * anterior lograba; el reparto está en docs/PLAN.md.
 */
const CONFIGS: Record<Difficulty, Omit<TicTacToeConfig, 'vsMachine'>> = {
  1: { sharpness: 0.55 },
  2: { sharpness: 0.7 },
  3: { sharpness: 0.82 },
  4: { sharpness: 0.9 },
  5: { sharpness: 0.96 },
};

export const DUO_MODE = 'duo';

const empty = (): Board => Array.from({ length: 9 }, () => null);

export const ticTacToeEngine: GameEngine<TicTacToeState, TicTacToeMove, TicTacToeConfig> = {
  getDifficultyConfig(difficulty, mode) {
    return { ...CONFIGS[difficulty], vsMachine: mode !== DUO_MODE };
  },

  createInitialState(config, seed) {
    return {
      board: empty(),
      turn: PLAYER,
      line: null,
      config,
      seed: seed ?? String(Date.now()),
      plies: 0,
    };
  },

  validate(state, move) {
    if (state.line !== null) return { ok: false, reason: 'La partida ya terminó.' };
    if (state.board[move.cell] !== null) {
      return {
        ok: false,
        reason: 'Esa casilla ya está ocupada.',
        cells: [{ row: Math.floor(move.cell / 3), col: move.cell % 3 }],
      };
    }
    return { ok: true };
  },

  /**
   * Poner la ficha y, contra la máquina, su respuesta — todo en una jugada.
   *
   * Las dos cosas juntas y no en dos pasos porque el contrato exige que esto
   * sea puro: si la respuesta de la máquina llegara después, por un efecto o un
   * temporizador, deshacer devolvería a una posición a medias en la que le toca
   * a un rival que no existe. Encerrada acá, deshacer saca las DOS fichas y
   * vuelve exactamente a donde el jugador estaba decidiendo.
   *
   * Es determinista: la jugada de la máquina sale de (semilla, número de
   * jugada), así que rehacer reproduce la misma partida.
   */
  applyMove(state, move) {
    const board = state.board.slice();
    board[move.cell] = state.turn;

    const line = winningLine(board);
    if (line !== null || freeCells(board).length === 0) {
      return { ...state, board, line, turn: other(state.turn) };
    }

    if (!state.config.vsMachine) {
      return { ...state, board, line: null, turn: other(state.turn) };
    }

    const reply = machineMove(board, MACHINE, state.config, state.seed, state.plies);
    if (reply < 0) return { ...state, board, line: null, turn: MACHINE };
    board[reply] = MACHINE;

    return {
      ...state,
      board,
      line: winningLine(board),
      turn: PLAYER,
      plies: state.plies + 1,
    };
  },

  checkStatus(state) {
    const { line } = state;

    if (line !== null) {
      const winner = state.board[line[0] ?? 0];

      /* Contra la máquina el shell ya sabe tutear: ganó o perdió QUIEN JUEGA.
         Entre dos personas no sabe cuál de las dos mira la pantalla, así que
         el nombre del ganador lo pone el juego. */
      if (!state.config.vsMachine) {
        return { kind: 'won', winner: winner === 'x' ? 'Ganan las X' : 'Ganan las O' };
      }
      if (winner === PLAYER) return { kind: 'won' };
      return { kind: 'lost', reason: 'La máquina hizo tres en línea.' };
    }

    if (freeCells(state.board).length === 0) {
      return { kind: 'draw', reason: 'Tablero lleno y ninguna línea. Buen resultado.' };
    }

    return { kind: 'playing' };
  },

  /**
   * Cuánto queda de tablero, que acá es lo único que avanza de verdad.
   *
   * En un juego de dos lados no existe "cuánto te falta para ganar" — podés
   * ganar en la tercera ficha o no ganar nunca. Lo que sí avanza siempre es el
   * tablero llenándose, y eso es información útil: mide lo cerca que está el
   * empate.
   */
  getProgress(state) {
    return (9 - freeCells(state.board).length) / 9;
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as TicTacToeState;
  },
};
