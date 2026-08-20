import { type ArcadeEngine } from '@core/arcade';
import { type Difficulty } from '@core/contract';

import { type Heading, type SnakeConfig, type SnakeMove, type SnakeState } from './types';

/*
 * La escala mueve tres cosas juntas: el tablero, la meta y la velocidad.
 *
 * Un tablero más grande no es más difícil por sí solo —hay más lugar para
 * girar—, así que sube acompañado de una meta más larga y un paso más corto.
 * Lo que sí queda fijo es que el nivel 1 se pueda ganar: doce de largo en un
 * tablero de nueve con pasos de 220 ms es una partida de menos de un minuto.
 */
const CONFIGS: Record<Difficulty, SnakeConfig> = {
  1: { cols: 9, rows: 9, target: 12, baseMs: 220 },
  2: { cols: 11, rows: 11, target: 18, baseMs: 190 },
  3: { cols: 13, rows: 13, target: 26, baseMs: 165 },
  4: { cols: 15, rows: 15, target: 36, baseMs: 145 },
  5: { cols: 17, rows: 17, target: 50, baseMs: 125 },
};

/** Por debajo de esto el juego deja de ser difícil y pasa a ser injusto. */
const FLOOR_MS = 70;
/** Cuánto se acorta el paso por cada fruta comida. */
const SPEEDUP_MS = 4;

const OPPOSITE: Record<Heading, Heading> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** El azar de una fruta concreta, como función de (semilla, número de fruta). */
function randomAt(seed: string, step: number): number {
  let a = hash(`${seed}#${String(step)}`);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Una casilla libre para la fruta. Nunca debajo del cuerpo. */
function placeFood(state: Pick<SnakeState, 'cols' | 'rows' | 'body' | 'seed' | 'spawns'>): number {
  const total = state.cols * state.rows;
  const taken = new Set(state.body);
  const free: number[] = [];
  for (let i = 0; i < total; i += 1) if (!taken.has(i)) free.push(i);
  if (free.length === 0) return -1;

  return free[Math.floor(randomAt(state.seed, state.spawns) * free.length)] ?? free[0] ?? -1;
}

/** La casilla de adelante, o -1 si eso es la pared. */
function ahead(index: number, heading: Heading, cols: number, rows: number): number {
  const row = Math.floor(index / cols);
  const col = index % cols;

  if (heading === 'up') return row === 0 ? -1 : index - cols;
  if (heading === 'down') return row === rows - 1 ? -1 : index + cols;
  if (heading === 'left') return col === 0 ? -1 : index - 1;
  return col === cols - 1 ? -1 : index + 1;
}

export const snakeEngine: ArcadeEngine<SnakeState, SnakeMove, SnakeConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const middle = Math.floor(config.rows / 2);
    const start = middle * config.cols + Math.floor(config.cols / 2);

    // Arranca de tres y mirando a la derecha, con medio tablero por delante:
    // nadie debería morir antes de entender qué botón hace qué.
    const body = [start, start - 1, start - 2];
    const base = {
      cols: config.cols,
      rows: config.rows,
      body,
      seed: seed ?? String(Date.now()),
      spawns: 0,
    };

    return {
      ...base,
      heading: 'right',
      pending: null,
      food: placeFood(base),
      target: config.target,
      baseMs: config.baseMs,
      dead: false,
    };
  },

  /**
   * El giro se encola, no se aplica.
   *
   * Y se rechaza el opuesto exacto: pedir "izquierda" yendo a la derecha
   * metería la cabeza en el propio cuello en el paso siguiente. No es una regla
   * inventada — es que ese movimiento no existe en el juego.
   */
  applyMove(state, move) {
    if (state.dead) return state;
    if (move.heading === state.heading || move.heading === OPPOSITE[state.heading]) return state;
    return { ...state, pending: move.heading };
  },

  tick(state) {
    if (state.dead) return state;

    const heading = state.pending ?? state.heading;
    const head = ahead(state.body[0] ?? 0, heading, state.cols, state.rows);

    // La pared.
    if (head === -1) return { ...state, heading, pending: null, dead: true };

    const eating = head === state.food;
    // La cola se va a mover, así que pisarla NO es chocar — salvo que estés
    // creciendo, en cuyo caso la cola se queda donde está.
    const body = eating ? state.body : state.body.slice(0, -1);
    if (body.includes(head)) return { ...state, heading, pending: null, dead: true };

    const grown = [head, ...body];
    if (!eating) return { ...state, heading, pending: null, body: grown };

    const spawns = state.spawns + 1;
    return {
      ...state,
      heading,
      pending: null,
      body: grown,
      spawns,
      food: placeFood({ ...state, body: grown, spawns }),
    };
  },

  /** Cada fruta acorta el paso, con un piso. Es el género entero. */
  tickMs(state) {
    const eaten = state.body.length - 3;
    return Math.max(FLOOR_MS, state.baseMs - eaten * SPEEDUP_MS);
  },

  checkStatus(state) {
    if (state.body.length >= state.target) return { kind: 'won', score: state.body.length };
    if (state.dead) return { kind: 'lost', reason: 'Ahí se terminó.' };
    return { kind: 'playing' };
  },

  getProgress(state) {
    return (state.body.length - 3) / (state.target - 3);
  },
};
