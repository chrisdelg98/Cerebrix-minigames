import { type Difficulty, type GameEngine } from '@core/contract';

import { solve, toggle } from './lights';
import { type ApagonConfig, type ApagonMove, type ApagonState } from './types';

/*
 * Dos perillas: cuán grande es el tablero y cuán revuelto está.
 *
 * Crecen alternadas a propósito. Subir las dos a la vez hace que un nivel se
 * sienta el doble de duro que el anterior, y la escala se queda sin lugar antes
 * de llegar a cinco.
 */
const CONFIGS: Record<Difficulty, ApagonConfig> = {
  1: { size: 3, clicks: 3 },
  2: { size: 4, clicks: 5 },
  3: { size: 5, clicks: 8 },
  4: { size: 5, clicks: 14 },
  5: { size: 6, clicks: 18 },
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Arma un tablero aplicando toques distintos sobre uno apagado. */
function scramble(size: number, clicks: number, rng: () => number): boolean[] {
  const n = size * size;
  const chosen = new Set<number>();
  while (chosen.size < Math.min(clicks, n)) chosen.add(Math.floor(rng() * n));

  let lights: boolean[] = Array.from({ length: n }, () => false);
  for (const index of chosen) lights = toggle(lights, index, size);
  return lights;
}

export const apagonEngine: GameEngine<ApagonState, ApagonMove, ApagonConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  /*
   * El tablero se genera AL REVÉS, y ahí está todo el truco.
   *
   * Encender luces al azar daría tableros que a veces no se pueden apagar, y
   * comprobarlo obligaría a resolver cada candidato y descartar los malos —
   * que es la maquinaria cara que necesitan Sudoku, Queens o Trazo. Partiendo
   * de un tablero apagado y aplicando toques, la solución son esos mismos
   * toques: existe por construcción y no hay nada que verificar.
   */
  createInitialState(config, seed) {
    const rng = makeRng(seed ?? String(Date.now()));

    let lights = scramble(config.size, config.clicks, rng);
    // Un puñado de toques puede cancelarse entre sí y devolver el tablero
    // apagado, o sea una partida ya ganada. Es rarísimo, y sale volviendo a tirar.
    let tries = 0;
    while (lights.every((on) => !on) && tries < 8) {
      lights = scramble(config.size, config.clicks, rng);
      tries += 1;
    }

    return { size: config.size, lights, moves: 0 };
  },

  validate(state, move) {
    if (move.index < 0 || move.index >= state.lights.length) {
      return { ok: false, reason: 'Esa casilla no existe.' };
    }
    return { ok: true };
  },

  applyMove(state, move) {
    return {
      ...state,
      lights: toggle(state.lights, move.index, state.size),
      moves: state.moves + 1,
    };
  },

  checkStatus(state) {
    return state.lights.every((on) => !on)
      ? { kind: 'won', score: state.moves }
      : { kind: 'playing' };
  },

  /*
   * No se puede perder, así que no hay estado perdido.
   *
   * Cualquier tablero se puede seguir tocando indefinidamente y la solución
   * nunca se pierde: tocar dos veces la misma casilla deshace. Un contador de
   * intentos acá sería un castigo inventado.
   */

  getProgress(state) {
    const off = state.lights.filter((on) => !on).length;
    return off / state.lights.length;
  },

  /**
   * El toque exacto que sigue, no el camino entero.
   *
   * Es una pista honesta porque no revela nada que el jugador no esté viendo:
   * el tablero contiene toda la información necesaria para deducirla, a
   * diferencia de Memoria, donde la pista tramposa sería decir dónde está un
   * par que nunca se dio vuelta.
   */
  getHint(state) {
    const solution = solve(state.lights, state.size);
    const index = solution?.[0];
    if (index === undefined) return null;

    const row = Math.floor(index / state.size);
    const col = index % state.size;

    return {
      cells: [{ row, col }],
      message: `Tocá la de la fila ${String(row + 1)}, columna ${String(col + 1)}.`,
    };
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as ApagonState;
  },
};
