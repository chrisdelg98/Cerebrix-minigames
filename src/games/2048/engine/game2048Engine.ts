import { type Difficulty, type GameEngine } from '@core/contract';

import {
  type Direction,
  type Game2048Config,
  type Game2048Move,
  type Game2048State,
} from './types';

/*
 * La escala mueve la meta, no el tablero.
 *
 * Arranca en 128 y no en 256: el primer nivel tiene que ser una partida corta
 * que se pueda ganar de entrada, no una versión un poco más breve de la de
 * siempre. Y termina en 2048, que es el nombre del juego — el nivel más alto
 * es la partida clásica, no una inventada más allá de ella.
 *
 * Agrandar la grilla haría el juego MÁS fácil — más lugar libre es más margen
 * para equivocarse —, así que un 5×5 en el nivel 5 diría lo contrario de lo que
 * promete. Lo que cambia es hasta dónde hay que llegar, que es la única medida
 * de dificultad que este juego tiene de verdad.
 */
const CONFIGS: Record<Difficulty, Game2048Config> = {
  1: { size: 4, target: 128 },
  2: { size: 4, target: 256 },
  3: { size: 4, target: 512 },
  4: { size: 4, target: 1024 },
  5: { size: 4, target: 2048 },
};

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

/** Cuántas veces de cada diez la ficha nueva es un 2 y no un 4. */
const CHANCE_OF_TWO = 0.9;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * El azar de una aparición concreta, sin estado mutable de por medio.
 *
 * No es un generador que se guarda y avanza: es una función de (semilla, paso).
 * Por eso `applyMove` puede seguir siendo pura y deshacer sigue funcionando.
 */
function rngFor(seed: string, step: number): () => number {
  let a = hash(`${seed}#${String(step)}`);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Empuja una línea hacia el índice 0 y fusiona los pares iguales.
 *
 * Una ficha solo puede fusionarse una vez por jugada: con 2·2·2·2 el resultado
 * es 4·4 y no 8. Por eso el par consumido se saltea en vez de volver a mirarse.
 */
function slideLine(values: number[]): { line: number[]; gained: number } {
  const packed = values.filter((value) => value !== 0);
  const line: number[] = [];
  let gained = 0;

  for (let i = 0; i < packed.length; i += 1) {
    const value = packed[i] ?? 0;
    if (value !== 0 && value === packed[i + 1]) {
      const merged = value * 2;
      line.push(merged);
      gained += merged;
      i += 1;
    } else {
      line.push(value);
    }
  }

  while (line.length < values.length) line.push(0);
  return { line, gained };
}

/** Los índices de una fila o columna, en el orden en que la jugada los recorre. */
function lineIndexes(size: number, dir: Direction, n: number): number[] {
  const indexes: number[] = [];
  for (let i = 0; i < size; i += 1) {
    if (dir === 'left') indexes.push(n * size + i);
    else if (dir === 'right') indexes.push(n * size + (size - 1 - i));
    else if (dir === 'up') indexes.push(i * size + n);
    else indexes.push((size - 1 - i) * size + n);
  }
  return indexes;
}

function slideBoard(
  tiles: number[],
  size: number,
  dir: Direction
): { tiles: number[]; gained: number } {
  const next = [...tiles];
  let gained = 0;

  for (let n = 0; n < size; n += 1) {
    const indexes = lineIndexes(size, dir, n);
    const values = indexes.map((index) => tiles[index] ?? 0);
    const slid = slideLine(values);
    gained += slid.gained;
    indexes.forEach((index, i) => {
      next[index] = slid.line[i] ?? 0;
    });
  }

  return { tiles: next, gained };
}

function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Deja caer una ficha nueva en una casilla libre, elegida por (semilla, paso). */
function spawn(state: Game2048State): Game2048State {
  const empty: number[] = [];
  for (let i = 0; i < state.tiles.length; i += 1) {
    if (state.tiles[i] === 0) empty.push(i);
  }
  if (empty.length === 0) return state;

  const rng = rngFor(state.seed, state.spawns);
  const cell = empty[Math.floor(rng() * empty.length)] ?? empty[0] ?? 0;
  const value = rng() < CHANCE_OF_TWO ? 2 : 4;

  const tiles = [...state.tiles];
  tiles[cell] = value;
  return { ...state, tiles, spawns: state.spawns + 1 };
}

function highest(tiles: number[]): number {
  return tiles.reduce((max, value) => (value > max ? value : max), 0);
}

/** ¿Queda alguna dirección que mueva algo? Si no, la partida terminó. */
function hasMove(state: Game2048State): boolean {
  return DIRECTIONS.some(
    (dir) => !same(slideBoard(state.tiles, state.size, dir).tiles, state.tiles)
  );
}

export const game2048Engine: GameEngine<Game2048State, Game2048Move, Game2048Config> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const base: Game2048State = {
      size: config.size,
      tiles: Array.from({ length: config.size * config.size }, () => 0),
      target: config.target,
      score: 0,
      seed: seed ?? String(Date.now()),
      spawns: 0,
    };

    // Dos fichas para empezar, como el original: con una sola la primera jugada
    // no tendría con qué fusionar y sería siempre gratis.
    return spawn(spawn(base));
  },

  /*
   * Una jugada que no mueve nada se rechaza en vez de ignorarse.
   *
   * Si se aceptara, el estado nuevo sería idéntico al anterior y la pila de
   * deshacer se llenaría de pasos que no hicieron nada — habría que tocar
   * deshacer cuatro veces para volver una jugada. Rechazándola, el shell además
   * dice por qué, que es información real: ese lado está trabado.
   */
  validate(state, move) {
    if (!DIRECTIONS.includes(move.dir)) return { ok: false, reason: 'Esa dirección no existe.' };

    const slid = slideBoard(state.tiles, state.size, move.dir);
    if (same(slid.tiles, state.tiles)) {
      return { ok: false, reason: 'Para ese lado no se mueve nada.' };
    }
    return { ok: true };
  },

  applyMove(state, move) {
    const { tiles, gained } = slideBoard(state.tiles, state.size, move.dir);
    if (same(tiles, state.tiles)) return state;

    return spawn({ ...state, tiles, score: state.score + gained });
  },

  checkStatus(state) {
    if (highest(state.tiles) >= state.target) return { kind: 'won', score: state.score };
    if (!hasMove(state)) return { kind: 'lost', reason: 'No queda ninguna jugada posible.' };
    return { kind: 'playing' };
  },

  /*
   * El avance se mide en duplicaciones, no en fichas.
   *
   * De 2 a 4 es un paso y de 1024 a 2048 también, pero el segundo cuesta toda
   * la partida. Contar en potencias de dos hace que la barra represente lo que
   * falta y no lo que se ve.
   */
  getProgress(state) {
    const max = highest(state.tiles);
    if (max <= 2) return 0;
    return (Math.log2(max) - 1) / (Math.log2(state.target) - 1);
  },

  /*
   * Sin pista, a propósito.
   *
   * `getHint` es opcional y su ausencia apaga el botón del shell. Acá la única
   * pista posible sería la mejor dirección, o sea jugar en lugar del jugador:
   * no hay nada que él ya sepa y esté olvidando, que es lo que una pista honesta
   * le devuelve en Memoria o en Sudoku.
   */

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as Game2048State;
  },
};
