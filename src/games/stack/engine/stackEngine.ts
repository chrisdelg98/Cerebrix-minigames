import { type ArcadeEngine } from '@core/arcade';
import { type Difficulty } from '@core/contract';

import { type Piece, type StackConfig, type StackMove, type StackState } from './types';

/*
 * Sube la altura pedida y baja el ancho de partida y el tiempo de reacción.
 *
 * La resolución (`slots`) no se toca: es lo que decide cuánto cuesta un error
 * de un pelo, y cambiarla entre niveles haría que el mismo desliz costara
 * distinto en cada uno. Lo que cambia es cuánto margen se tiene al empezar.
 */
const CONFIGS: Record<Difficulty, StackConfig> = {
  1: { slots: 32, target: 10, startWidth: 14, baseMs: 130 },
  2: { slots: 32, target: 15, startWidth: 12, baseMs: 115 },
  3: { slots: 32, target: 20, startWidth: 11, baseMs: 100 },
  4: { slots: 32, target: 26, startWidth: 10, baseMs: 88 },
  5: { slots: 32, target: 34, startWidth: 9, baseMs: 76 },
};

/** Por debajo de esto el juego deja de ser difícil y pasa a ser injusto. */
const FLOOR_MS = 34;

/** Cuánto se acorta el paso por piso levantado. */
const SPEEDUP_MS = 2.5;

/** La pieza de más arriba: sobre ella hay que apoyar. */
function top(state: StackState): Piece {
  return state.tower[state.tower.length - 1] ?? { start: 0, width: state.fullWidth };
}

export const stackEngine: ArcadeEngine<StackState, StackMove, StackConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  /*
   * El único juego de la casa que no necesita azar.
   *
   * Snake sortea la fruta, 2048 la ficha nueva y Cruzar el mundo entero; acá no
   * hay nada que sortear. El bloque sale siempre del mismo lado y rebota, y todo
   * lo demás lo decide el jugador. Dos partidas del mismo nivel arrancan
   * idénticas, y aun así ninguna se parece: la diferencia la pone el pulso.
   */
  createInitialState(config) {
    const start = Math.floor((config.slots - config.startWidth) / 2);

    return {
      slots: config.slots,
      tower: [{ start, width: config.startWidth }],
      moving: { start: 0, width: config.startWidth, dir: 1 },
      target: config.target,
      fullWidth: config.startWidth,
      streak: 0,
      baseMs: config.baseMs,
      dead: false,
    };
  },

  /** El bloque va y viene. Rebota al tocar el borde, sin quedarse pegado. */
  tick(state) {
    if (state.dead) return state;

    const { start, width, dir } = state.moving;
    const next = start + dir;

    if (next < 0 || next + width > state.slots) {
      const turned = dir === 1 ? -1 : 1;
      return { ...state, moving: { start: start + turned, width, dir: turned } };
    }

    return { ...state, moving: { start: next, width, dir } };
  },

  /**
   * Apoyar. Lo que sobresale se cae.
   *
   * Es toda la mecánica en tres líneas: la parte que no se superpone con la
   * pieza de abajo deja de existir, y la que queda es el ancho con el que se
   * sigue jugando. Perder no es un evento aparte — es que no quedó nada.
   */
  applyMove(state, move) {
    if (state.dead || move.kind !== 'drop') return state;

    const below = top(state);
    const start = Math.max(state.moving.start, below.start);
    const end = Math.min(state.moving.start + state.moving.width, below.start + below.width);
    const width = end - start;

    if (width <= 0) return { ...state, dead: true };

    /*
     * El apoyo perfecto devuelve una ranura, hasta el ancho original.
     *
     * Sin esto la torre solo se puede angostar y cada partida tiene un techo
     * fijo por más bien que se juegue: la habilidad decidiría cuándo perdés,
     * nunca si podés remontar. Con la devolución, clavar varios seguidos
     * recupera terreno — que es lo que hace que valga la pena apuntar en vez de
     * apurarse.
     */
    const perfect = width === state.moving.width;
    const kept = perfect ? Math.min(state.fullWidth, width + 1) : width;
    const placed: Piece = { start: perfect ? below.start : start, width: kept };

    // El siguiente entra por el lado contrario al que venía: obliga a leer el
    // recorrido de nuevo en vez de repetir el mismo golpe de pulgar.
    const fromLeft = state.moving.dir === 1;

    return {
      ...state,
      tower: [...state.tower, placed],
      moving: {
        start: fromLeft ? state.slots - kept : 0,
        width: kept,
        dir: fromLeft ? -1 : 1,
      },
      streak: perfect ? state.streak + 1 : 0,
    };
  },

  /** Cada piso acorta el paso, con un piso mínimo. */
  tickMs(state) {
    return Math.max(FLOOR_MS, state.baseMs - (state.tower.length - 1) * SPEEDUP_MS);
  },

  checkStatus(state) {
    if (state.tower.length - 1 >= state.target) {
      return { kind: 'won', score: state.tower.length - 1 };
    }
    if (state.dead) return { kind: 'lost', reason: 'No quedó dónde apoyar.' };
    return { kind: 'playing' };
  },

  getProgress(state) {
    return (state.tower.length - 1) / state.target;
  },
};
