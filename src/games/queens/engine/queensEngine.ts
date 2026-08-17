import { type Difficulty, type GameEngine } from '@core/contract';

import { generatePuzzle } from './generate';
import { candidates, queensOn, violations } from './solve';
import {
  EMPTY,
  MARK,
  QUEEN,
  type Cell,
  type QueensConfig,
  type QueensMove,
  type QueensState,
} from './types';

/*
 * El tamaño es la dificultad. Tope en 8 y no en 9, medido: exigir que cada
 * región quede de una sola pieza vuelve mucho más difícil llegar a solución
 * única, y en 9×9 el generador la alcanzaba 16 de cada 20 veces. Un tablero
 * ambiguo es peor que un tablero más chico.
 */
const CONFIGS: Record<Difficulty, QueensConfig> = {
  1: { size: 4 },
  2: { size: 5 },
  3: { size: 6 },
  4: { size: 7 },
  5: { size: 8 },
};

const LINES = ['fila', 'columna', 'región'] as const;

export const queensEngine: GameEngine<QueensState, QueensMove, QueensConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const puzzle = generatePuzzle(config, seed);
    return {
      size: puzzle.size,
      regions: puzzle.regions,
      marks: new Array<Cell>(puzzle.size * puzzle.size).fill(EMPTY),
      solution: puzzle.solution,
    };
  },

  validate(state, move) {
    if (move.index < 0 || move.index >= state.marks.length) {
      return { ok: false, reason: 'Esa casilla no existe.' };
    }
    return { ok: true };
  },

  applyMove(state, move) {
    const marks = [...state.marks];
    marks[move.index] = move.value;
    return { ...state, marks };
  },

  /*
   * Comprobado contra las reglas y no contra la solución: da igual en la
   * práctica, porque el tablero se genera con solución única, pero decirlo con
   * las reglas es decir lo que el juego realmente pide.
   */
  checkStatus(state) {
    const placed = queensOn(state.marks, state.size);
    if (placed.length !== state.size) return { kind: 'playing' };
    return violations(state.marks, state.regions, state.size).length === 0
      ? { kind: 'won' }
      : { kind: 'playing' };
  },

  getProgress(state) {
    return queensOn(state.marks, state.size).length / state.size;
  },

  /**
   * Busca una línea donde ya solo quede una casilla posible, y la nombra.
   *
   * Es el razonamiento con el que se juega de verdad — no «acá va una corona»
   * sino «acá tiene que ir, porque no queda otro lugar». Fila, columna y región
   * se miran en ese orden, que es el orden en que se ven.
   */
  getHint(state) {
    const { size, regions, marks } = state;
    const open = candidates(marks, regions, size);
    const taken = queensOn(marks, size);

    // Una región no es un rango contiguo de índices, así que se arma aparte.
    const byRow: number[][] = Array.from({ length: size }, () => []);
    const byCol: number[][] = Array.from({ length: size }, () => []);
    const byRegion: number[][] = Array.from({ length: size }, () => []);

    for (let i = 0; i < size * size; i += 1) {
      if (open[i] !== true) continue;
      byRow[Math.floor(i / size)]?.push(i);
      byCol[i % size]?.push(i);
      byRegion[regions[i] as number]?.push(i);
    }

    const hasQueen = (cells: number[], which: number, kind: number): boolean =>
      taken.some(([r, c]) => {
        if (kind === 0) return r === which;
        if (kind === 1) return c === which;
        return regions[r * size + c] === which;
      }) || cells.length === 0;

    /*
     * Por qué NO puede ir en cada una de las otras.
     *
     * Decir «no queda ninguna otra» sin decir por qué no es una pista: es
     * pedirle al jugador que confíe. Cada casilla descartada tiene una razón
     * concreta — una corona en su columna, una en su región, una pegada, o su
     * propia ✕ — y esa razón es justo el razonamiento que se quería hacer.
     */
    const whyNot = (index: number): string | null => {
      if (marks[index] === MARK) return 'las tachaste vos';
      const row = Math.floor(index / size);
      const col = index % size;

      for (const [r, c] of taken) {
        if (Math.abs(r - row) <= 1 && Math.abs(c - col) <= 1) {
          return `tocan la corona de la fila ${String(r + 1)}`;
        }
        if (c === col) return `su columna ya tiene la corona de la fila ${String(r + 1)}`;
        if (r === row) return `su fila ya tiene corona`;
        if (regions[r * size + c] === regions[index]) return 'su región ya tiene corona';
      }
      return null;
    };

    for (const [kind, sets] of [byRow, byCol, byRegion].entries()) {
      for (const [which, cells] of sets.entries()) {
        if (hasQueen(cells, which, kind) || cells.length !== 1) continue;

        const index = cells[0] as number;
        const label = LINES[kind] ?? 'fila';
        const name = kind === 2 ? 'esta región' : `la ${label} ${String(which + 1)}`;

        // Las demás casillas de la línea, con su motivo.
        const reasons = new Set<string>();
        for (let i = 0; i < size * size; i += 1) {
          if (i === index || marks[i] === QUEEN) continue;
          const sameLine =
            kind === 0
              ? Math.floor(i / size) === which
              : kind === 1
                ? i % size === which
                : regions[i] === which;
          if (!sameLine) continue;
          const why = whyNot(i);
          if (why !== null) reasons.add(why);
        }

        const because = reasons.size === 0 ? '' : ` — ${[...reasons].join('; ')}`;

        return {
          cells: [{ row: Math.floor(index / size), col: index % size }],
          message: `En ${name}, todas las demás están descartadas${because}. Así que la corona va acá.`,
        };
      }
    }

    const missing = state.solution.findIndex((col, row) => marks[row * size + col] !== QUEEN);
    if (missing === -1) return null;

    const col = state.solution[missing] as number;
    return {
      cells: [{ row: missing, col }],
      message: `Todavía no hay una línea con una sola casilla libre. Probá descartando con ✕ lo que ya sabés: en la fila ${String(missing + 1)} la corona va en la columna ${String(col + 1)}.`,
    };
  },

  serialize(state) {
    return JSON.stringify({
      size: state.size,
      regions: state.regions.join(''),
      marks: state.marks.join(''),
      solution: state.solution,
    });
  },

  deserialize(raw) {
    const saved = JSON.parse(raw) as {
      size: number;
      regions: string;
      marks: string;
      solution: number[];
    };
    return {
      size: saved.size,
      regions: [...saved.regions].map(Number),
      marks: [...saved.marks].map((char) => Number(char) as Cell),
      solution: saved.solution,
    };
  },
};
