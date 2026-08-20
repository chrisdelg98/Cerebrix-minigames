import { type Difficulty, type GameEngine } from '@core/contract';

import { type SequenceConfig, type SequenceMove, type SequenceState } from './types';

/*
 * Más pastillas, más pasos y menos tiempo para mirarlos.
 *
 * El Simón electrónico —el juguete que le da origen a este juego— terminaba a
 * los 8, 14, 20 o 31 destellos. Acá la escala es más corta a propósito: una
 * partida tiene que caber en el viaje, y con el destello acelerándose además,
 * quince pasos a 330 ms ya cuesta.
 */
const CONFIGS: Record<Difficulty, SequenceConfig> = {
  1: { pads: 4, target: 5, tempoMs: 620 },
  2: { pads: 4, target: 8, tempoMs: 540 },
  3: { pads: 6, target: 10, tempoMs: 470 },
  4: { pads: 6, target: 12, tempoMs: 400 },
  5: { pads: 6, target: 15, tempoMs: 330 },
};

function makeRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const sequenceEngine: GameEngine<SequenceState, SequenceMove, SequenceConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const rng = makeRng(seed ?? String(Date.now()));
    const sequence: number[] = [];

    for (let i = 0; i < config.target; i += 1) {
      let pad = Math.floor(rng() * config.pads);
      // Nunca el mismo dos veces seguidas: repetido, el jugador no ve dos
      // destellos sino uno más largo, y la secuencia se vuelve ambigua.
      if (i > 0 && pad === sequence[i - 1]) pad = (pad + 1) % config.pads;
      sequence.push(pad);
    }

    return {
      pads: config.pads,
      sequence,
      round: 1,
      progress: 0,
      target: config.target,
      lost: false,
      tempoMs: config.tempoMs,
    };
  },

  validate(state, move) {
    if (state.lost) return { ok: false, reason: 'La partida ya terminó.' };
    if (move.pad < 0 || move.pad >= state.pads) {
      return { ok: false, reason: 'Esa pastilla no existe.' };
    }
    return { ok: true };
  },

  /*
   * Una pulsación es un movimiento, y de ahí sale todo lo demás.
   *
   * No hay reloj acá adentro: la vista se encarga de mostrar la secuencia y de
   * esperar entre destello y destello, igual que el temporizador que vuelve a
   * tapar un par en Memoria. El motor solo sabe si lo que tocaste era lo que
   * seguía.
   */
  applyMove(state, move) {
    if (move.pad !== state.sequence[state.progress]) return { ...state, lost: true };

    const progress = state.progress + 1;
    if (progress < state.round) return { ...state, progress };

    return { ...state, progress: 0, round: state.round + 1 };
  },

  checkStatus(state) {
    if (state.lost) return { kind: 'lost', reason: 'Ahí se cortó la secuencia.' };
    return state.round > state.target ? { kind: 'won' } : { kind: 'playing' };
  },

  getProgress(state) {
    return Math.min(1, (state.round - 1) / state.target);
  },

  /**
   * Te recuerda el paso que sigue, no la secuencia entera.
   *
   * En un juego de memoria la pista honesta es acordarse por vos de algo que ya
   * viste — la secuencia te la mostraron recién. Adelantar los pasos siguientes
   * sería jugar en tu lugar.
   */
  getHint(state) {
    if (state.lost) return null;
    const pad = state.sequence[state.progress];
    if (pad === undefined) return null;

    return {
      cells: [{ row: 0, col: pad }],
      message: `Vas por el paso ${String(state.progress + 1)} de ${String(state.round)}: la que sigue es la número ${String(pad + 1)}.`,
    };
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as SequenceState;
  },
};
