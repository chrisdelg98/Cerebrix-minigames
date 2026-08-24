import { type Difficulty, type GameEngine } from '@core/contract';

import { generatePuzzle } from './generate';
import { area, cellsOf, covers, numbersIn } from './solve';
import { type Rect, type ShikakuConfig, type ShikakuMove, type ShikakuState } from './types';

/**
 * Dos palancas: el tablero y el área máxima de un rectángulo.
 *
 * El tablero llega hasta 10×10 y ahí se corta — no por costo, que es de un
 * milisegundo, sino por el dedo: a 360px son casillas de 33px, y en 12×12
 * bajaban a 28, que con arrastre queda apretado.
 *
 * Con el tamaño topado, la dificultad de arriba la pone la otra palanca.
 * Rectángulos más grandes significan menos números, así que cada pista manda
 * sobre más casillas y hay más que deducir. Medido en 10×10: con piezas de hasta
 * 9 son 3.25 casillas por pista; hasta 20, son 5.78 — más exigente que el viejo
 * 12×12, en un tablero más cómodo.
 *
 * Y es la palanca que hace al nivel 1 realmente fácil: en 5×5 con piezas de
 * hasta 4, cada número manda sobre dos casillas y se ve de un vistazo.
 *
 * Casillas por pista, medido: 2.2 · 2.6 · 3.4 · 4.2 · 5.8.
 */
const CONFIGS: Record<Difficulty, ShikakuConfig> = {
  1: { size: 5, maxArea: 4 },
  2: { size: 7, maxArea: 6 },
  3: { size: 8, maxArea: 9 },
  4: { size: 10, maxArea: 12 },
  5: { size: 10, maxArea: 20 },
};

const place = (cell: number, size: number): string =>
  `fila ${String(Math.floor(cell / size) + 1)}, columna ${String((cell % size) + 1)}`;

/** El rectángulo que va de una casilla a otra, en cualquier orden de arrastre. */
export function rectBetween(from: number, to: number, size: number): Rect {
  const x1 = from % size;
  const y1 = Math.floor(from / size);
  const x2 = to % size;
  const y2 = Math.floor(to / size);
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1) + 1,
    h: Math.abs(y2 - y1) + 1,
  };
}

export const shikakuEngine: GameEngine<ShikakuState, ShikakuMove, ShikakuConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const puzzle = generatePuzzle(config, seed);
    return { size: puzzle.size, numbers: puzzle.numbers, rects: [], solution: puzzle.solution };
  },

  /**
   * Solo se dibujan rectángulos que puedan ser parte de una solución.
   *
   * Los Shikaku digitales clásicos son permisivos: dejan dibujar cualquier cosa
   * y solo sombrean la correcta. Acá se rechaza con motivo, y no quita
   * dificultad: un rectángulo sin número, con dos, o cuya área no coincide **no
   * está en ninguna solución posible**, nunca. Lo difícil de Shikaku es elegir
   * entre los rectángulos VÁLIDOS cuál es el bueno, y eso queda intacto.
   *
   * Lo que sí quita son los errores que no enseñan nada.
   */
  validate(state, move) {
    if (move.kind === 'erase') {
      const found = state.rects.some((rect) => covers(rect, move.cell, state.size));
      return found ? { ok: true } : { ok: false, reason: 'Ahí no hay ningún rectángulo.' };
    }

    const rect = rectBetween(move.from, move.to, state.size);
    const inside = numbersIn(rect, state.size, state.numbers);

    if (inside.length === 0) {
      return { ok: false, reason: 'Cada rectángulo tiene que contener un número.' };
    }
    if (inside.length > 1) {
      return { ok: false, reason: 'Ese rectángulo agarra dos números. Tiene que ser uno solo.' };
    }

    const value = inside[0] ?? 0;
    if (value !== area(rect)) {
      return {
        ok: false,
        reason: `Ese rectángulo mide ${String(area(rect))} y el número dice ${String(value)}.`,
        cells: [{ row: rect.y, col: rect.x }],
      };
    }

    return { ok: true };
  },

  /**
   * Dibujar reemplaza lo que pise, que es como funcionan los Shikaku de
   * siempre: corregir es redibujar encima, sin borrar antes.
   */
  applyMove(state, move) {
    if (move.kind === 'erase') {
      return {
        ...state,
        rects: state.rects.filter((rect) => !covers(rect, move.cell, state.size)),
      };
    }

    const rect = rectBetween(move.from, move.to, state.size);
    const taken = new Set(cellsOf(rect, state.size));
    const kept = state.rects.filter(
      (other) => !cellsOf(other, state.size).some((cell) => taken.has(cell))
    );

    return { ...state, rects: [...kept, rect] };
  },

  /**
   * Cubrir el tablero ES resolverlo.
   *
   * No hace falta comparar contra la solución guardada: todo rectángulo puesto
   * lleva exactamente un número y mide lo que ese número dice, y ninguno se
   * pisa con otro. Un conjunto así que además cubra todo es, por definición, una
   * solución válida — y como el tablero se generó con una sola, es LA solución.
   */
  checkStatus(state) {
    const covered = state.rects.reduce((total, rect) => total + area(rect), 0);
    return covered === state.size * state.size ? { kind: 'won' } : { kind: 'playing' };
  },

  getProgress(state) {
    const covered = state.rects.reduce((total, rect) => total + area(rect), 0);
    return covered / (state.size * state.size);
  },

  /**
   * La pista es un rectángulo de la solución que todavía no está, elegido por el
   * más chico: es el que menos regala y el que más suele destrabar.
   */
  getHint(state) {
    const missing = state.solution
      .filter((rect) => !state.rects.some((one) => one.x === rect.x && one.y === rect.y))
      .sort((a, b) => area(a) - area(b));

    const rect = missing[0];
    if (rect === undefined) return null;

    const cell = rect.y * state.size + rect.x;
    return {
      cells: cellsOf(rect, state.size).map((one) => ({
        row: Math.floor(one / state.size),
        col: one % state.size,
      })),
      message: `Hay un rectángulo de ${String(area(rect))} que empieza en ${place(cell, state.size)}.`,
    };
  },

  serialize(state) {
    return JSON.stringify(state);
  },

  deserialize(raw) {
    return JSON.parse(raw) as ShikakuState;
  },
};
