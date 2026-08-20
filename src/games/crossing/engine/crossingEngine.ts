import { type ArcadeEngine } from '@core/arcade';
import { type Difficulty } from '@core/contract';

import { carsAt, laneAt, SAFE_START } from './lanes';
import { type CrossingConfig, type CrossingMove, type CrossingState } from './types';

/*
 * La presión sube por tres lados a la vez.
 *
 * El nivel 1 arrancó en 0.4 y el tablero se veía desierto: con las tres
 * primeras filas siempre a salvo, quedaba una sola calle a la vista y no había
 * nada que cruzar. La regla de "nunca tres calles seguidas" ya pone un techo
 * real, así que la proporción puede ser alta sin volverse injusta.
 * hay que llegar más lejos, el reloj
 * corre más rápido, y una proporción mayor de las filas son calle. El ancho
 * queda fijo — más columnas sería más lugar para esquivar, o sea más fácil, y
 * diría lo contrario de lo que promete el nivel.
 */
const CONFIGS: Record<Difficulty, CrossingConfig> = {
  1: { cols: 9, rows: 9, target: 12, baseMs: 460, traffic: 0.52 },
  2: { cols: 9, rows: 9, target: 18, baseMs: 410, traffic: 0.6 },
  3: { cols: 9, rows: 9, target: 26, baseMs: 360, traffic: 0.68 },
  4: { cols: 9, rows: 9, target: 34, baseMs: 320, traffic: 0.76 },
  5: { cols: 9, rows: 9, target: 45, baseMs: 280, traffic: 0.85 },
};

/** ¿Hay un auto encima del jugador ahora mismo? */
function runOver(state: CrossingState): boolean {
  const lane = laneAt(state.seed, state.distance, state.traffic);
  return carsAt(lane, state.cols, state.ticks).includes(state.col);
}

export const crossingEngine: ArcadeEngine<CrossingState, CrossingMove, CrossingConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    return {
      cols: config.cols,
      rows: config.rows,
      distance: 0,
      col: Math.floor(config.cols / 2),
      ticks: 0,
      target: config.target,
      traffic: config.traffic,
      baseMs: config.baseMs,
      dead: false,
      seed: seed ?? String(Date.now()),
    };
  },

  /**
   * Un paso por vez, y el reloj no se adelanta.
   *
   * Avanzar no hace pasar el tiempo: los autos siguen donde estaban. Eso es lo
   * que hace que el juego se pueda pensar — se mira el hueco, se calcula, se
   * cruza — en vez de ser una carrera contra la mano.
   */
  applyMove(state, move) {
    if (state.dead) return state;

    const next = { ...state };
    if (move.step === 'up') next.distance = state.distance + 1;
    else if (move.step === 'down') next.distance = Math.max(0, state.distance - 1);
    else if (move.step === 'left') next.col = Math.max(0, state.col - 1);
    else next.col = Math.min(state.cols - 1, state.col + 1);

    // Meterse debajo de un auto es morir, igual que si el auto te alcanza.
    return runOver(next) ? { ...next, dead: true } : next;
  },

  tick(state) {
    if (state.dead) return state;
    const next = { ...state, ticks: state.ticks + 1 };
    return runOver(next) ? { ...next, dead: true } : next;
  },

  /*
   * El reloj acelera con la distancia, no con el tiempo.
   *
   * Atado al tiempo, quedarse quieto en una vereda sería un castigo: el juego
   * se pondría imposible sin que el jugador hiciera nada. Atado a la distancia,
   * la dificultad la elige él cada vez que decide cruzar.
   */
  tickMs(state) {
    return Math.max(120, state.baseMs - state.distance * 6);
  },

  checkStatus(state) {
    if (state.distance >= state.target) return { kind: 'won', score: state.distance };
    if (state.dead) return { kind: 'lost', reason: 'Te pasó por encima.' };
    return { kind: 'playing' };
  },

  getProgress(state) {
    return state.distance / state.target;
  },
};

export { SAFE_START };
