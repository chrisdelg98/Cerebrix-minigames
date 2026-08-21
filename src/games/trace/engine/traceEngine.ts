import { type Difficulty, type GameEngine } from '@core/contract';

import { generatePuzzle } from './generate';
import { neighbours, reaches } from './solve';
import { type TraceConfig, type TraceMove, type TraceState } from './types';

/*
 * Tope en 6×6, medido: demostrar que NO existe un segundo recorrido es la parte
 * cara, y 7×7 no termina ni en noventa segundos. Con el tamaño casi fijo, la
 * dificultad la lleva **cuántos números quedan**, que es la palanca que de
 * verdad se siente: cada número parte el recorrido en un tramo corto y obvio,
 * así que sacarlos es lo que obliga a mirar el tablero entero.
 *
 * Los niveles 3 y 5 estaban los dos al mínimo y solo se diferenciaban por el
 * tamaño, que entre 5 y 6 casi no se nota. Ahora el mínimo es exclusivo del 5,
 * y los tres niveles de arriba comparten tablero para que lo único que cambie
 * sea cuánto te dan resuelto.
 */
/**
 * Dos mitades: deducir, y después recorrer.
 *
 * Del 1 al 3 el tablero tiene UNA sola solución, así que cada movimiento es una
 * deducción — "esto va acá porque si no aquella esquina queda aislada". El 3 es
 * la deducción al hueso: 6×6 adelgazado hasta unas ocho anclas sobre treinta y
 * seis. Ahí termina, y no por gusto: demostrar la unicidad es lo caro y de 7×7
 * en adelante el buscador se rinde casi siempre (ver `TraceConfig.unique`).
 *
 * El 4 y el 5 cambian de género. Sin exigir unicidad el tablero puede crecer, y
 * la dificultad pasa a ser conseguir un recorrido que cubra todo sin dejar
 * ninguna casilla aislada. Con eso se invierte la palanca de los números: acá
 * MÁS números es más difícil, hasta un punto — pasado ese punto el tablero se
 * vuelve unir puntos y se ablanda otra vez.
 *
 * Medido con un buscador a lo bruto, cuanto menos acierta más restringido está
 * el tablero: en 8×8 el fondo va de 14 a 18 números y a 22 ya se ablanda (4%);
 * en 9×9 el fondo va de 16 a 23 y sube a partir de 26. De ahí el 18 y el 23.
 *
 * El 9×9 es el techo, y el límite no es el costo —se genera en 17 ms— sino el
 * dedo: son celdas de 36px en un teléfono de 360px, y este juego se arrastra.
 * En 10×10 quedan 32px y cada giro del trazo pasa a ser una apuesta, que no es
 * dificultad sino imprecisión.
 */
const CONFIGS: Record<Difficulty, TraceConfig> = {
  1: { size: 4, keep: 9, unique: true },
  2: { size: 5, keep: 12, unique: true },
  3: { size: 6, keep: 0, unique: true },
  4: { size: 8, keep: 18, unique: false },
  5: { size: 9, keep: 23, unique: false },
};

function place(index: number, size: number): string {
  return `fila ${String(Math.floor(index / size) + 1)}, columna ${String((index % size) + 1)}`;
}

/** El número que el trazo tiene que tocar después de recorrer `path`. */
function expecting(state: TraceState): number {
  return state.path.reduce((count, cell) => count + ((state.numbers[cell] ?? 0) > 0 ? 1 : 0), 1);
}

export const traceEngine: GameEngine<TraceState, TraceMove, TraceConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const puzzle = generatePuzzle(config, seed);
    return { size: puzzle.size, numbers: puzzle.numbers, path: [], solution: puzzle.solution };
  },

  /*
   * El trazo llega entero y se valida entero: que arranque en el 1, que cada
   * paso sea a una casilla pegada, que no repita, y que los números aparezcan
   * en orden. La vista construye el trazo mientras el dedo se mueve, pero la
   * regla vive acá — que la vista no pueda dibujar algo ilegal es una
   * consecuencia agradable, no la garantía.
   */
  validate(state, move) {
    const { path } = move;
    if (path.length === 0) return { ok: true };
    if (state.numbers[path[0] as number] !== 1) {
      return { ok: false, reason: 'El trazo tiene que empezar en el 1.' };
    }

    const near = neighbours(state.size);
    const seen = new Set<number>();
    let next = 1;

    for (const [i, cell] of path.entries()) {
      if (seen.has(cell))
        return { ok: false, reason: 'El trazo no puede pasar dos veces por la misma casilla.' };
      seen.add(cell);

      if (i > 0 && !(near[path[i - 1] as number] as number[]).includes(cell)) {
        return { ok: false, reason: 'El trazo tiene que ir de una casilla a la de al lado.' };
      }

      const number = state.numbers[cell] ?? 0;
      if (number === 0) continue;
      if (number !== next) {
        return {
          ok: false,
          reason: `Los números van en orden: falta pasar por el ${String(next)}.`,
          cells: [{ row: Math.floor(cell / state.size), col: cell % state.size }],
        };
      }
      next += 1;
    }

    return { ok: true };
  },

  applyMove(state, move) {
    return { ...state, path: [...move.path] };
  },

  checkStatus(state) {
    return state.path.length === state.size * state.size ? { kind: 'won' } : { kind: 'playing' };
  },

  getProgress(state) {
    return state.path.length / (state.size * state.size);
  },

  /**
   * Descarta salidas por la regla de cubrirlo todo, y nombra la que queda.
   *
   * Es la deducción con la que se juega de verdad: no «andá para allá» sino
   * «para allá no, porque dejás casillas a las que ya no se puede volver». La
   * misma comprobación de alcance que usa el generador.
   */
  getHint(state) {
    const { size, numbers, path } = state;

    if (path.length === 0) {
      const start = numbers.indexOf(1);
      return {
        cells: [{ row: Math.floor(start / size), col: start % size }],
        message: `El trazo siempre arranca en el 1, acá en ${place(start, size)}.`,
      };
    }

    const head = path[path.length - 1] as number;
    const visited = new Array<boolean>(size * size).fill(false);
    for (const cell of path) visited[cell] = true;

    const next = expecting(state);
    const options = (neighbours(size)[head] as number[]).filter((cell) => visited[cell] !== true);

    const alive = options.filter((cell) => {
      const number = numbers[cell] ?? 0;
      if (number !== 0 && number !== next) return false;
      visited[cell] = true;
      const ok = reaches(size, visited, cell);
      visited[cell] = false;
      return ok;
    });

    const only = alive[0];
    if (alive.length === 1 && only !== undefined && options.length > 1) {
      return {
        cells: [{ row: Math.floor(only / size), col: only % size }],
        message: `Desde donde estás, cualquier otra salida deja casillas a las que ya no podrías volver, y el trazo tiene que pasar por todas. Solo queda ${place(only, size)}.`,
      };
    }

    if (alive.length === 0) {
      return {
        cells: [{ row: Math.floor(head / size), col: head % size }],
        message:
          'Desde acá ya no se puede seguir sin dejar casillas afuera. Volvé sobre tus pasos: arrastrá hacia atrás para deshacer el tramo.',
      };
    }

    const ahead = state.solution[path.length] as number;
    return {
      cells: [{ row: Math.floor(ahead / size), col: ahead % size }],
      message: `Todavía hay más de una salida posible. La que lleva al ${String(next)} sin dejar nada afuera es ${place(ahead, size)}.`,
    };
  },

  serialize(state) {
    return JSON.stringify({
      size: state.size,
      numbers: state.numbers,
      path: state.path,
      solution: state.solution,
    });
  },

  deserialize(raw) {
    return JSON.parse(raw) as TraceState;
  },
};
