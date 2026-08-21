import { describe, expect, it } from 'vitest';

import { type Difficulty } from '@core/contract';
import {
  connectFourEngine as engine,
  DUO_MODE,
} from '@games/connect-four/engine/connectFourEngine';
import {
  drop,
  landing,
  machineMove,
  openColumns,
  winningLine,
} from '@games/connect-four/engine/search';
import {
  type Board,
  type ConnectFourConfig,
  type ConnectFourState,
} from '@games/connect-four/engine/types';

function nueva(difficulty: Difficulty, seed: string, mode = 'machine'): ConnectFourState {
  return engine.createInitialState(
    engine.getDifficultyConfig(difficulty, mode),
    seed
  ) as ConnectFourState;
}

/** Suelta una lista de columnas en modo dos jugadores, sin máquina de por medio. */
function jugar(columnas: number[], seed = 'r'): ConnectFourState {
  let state = nueva(3, seed, DUO_MODE);
  for (const column of columnas) state = engine.applyMove(state, { column });
  return state;
}

describe('las reglas', () => {
  it('la ficha cae hasta el fondo, no queda donde se toca', () => {
    const state = jugar([3]);
    // Fila 5 es la de abajo en un tablero de 6.
    expect(state.board[5 * 7 + 3]).toBe('red');
    expect(state.board[3]).toBeNull();
  });

  it('la siguiente se apoya sobre la anterior', () => {
    const state = jugar([3, 3]);
    expect(state.board[5 * 7 + 3]).toBe('red');
    expect(state.board[4 * 7 + 3]).toBe('yellow');
  });

  it('cuatro en fila gana', () => {
    // Rojas en 0,1,2,3 abajo; amarillas van encima de las tres primeras.
    const state = jugar([0, 0, 1, 1, 2, 2, 3]);
    expect(engine.checkStatus(state).kind).toBe('won');
    expect(state.line).toHaveLength(4);
  });

  it('cuatro en columna gana', () => {
    const state = jugar([2, 3, 2, 3, 2, 3, 2]);
    expect(engine.checkStatus(state).kind).toBe('won');
  });

  it('cuatro en diagonal gana', () => {
    // Escalera: cada columna una ficha roja más alta que la anterior.
    const state = jugar([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    const status = engine.checkStatus(state);
    expect(status.kind, 'la diagonal no se detectó').toBe('won');
  });

  it('no deja soltar en una columna llena', () => {
    const state = jugar([0, 0, 0, 0, 0, 0]);
    expect(landing(state.board, 0)).toBe(-1);
    expect(engine.validate(state, { column: 0 }).ok).toBe(false);
  });
});

describe('los dos modos', () => {
  it('contra la máquina, ella contesta en la misma jugada', () => {
    const state = engine.applyMove(nueva(3, 'c'), { column: 3 });
    const puestas = state.board.filter((cell) => cell !== null);
    expect(puestas, 'la máquina no respondió').toHaveLength(2);
  });

  it('entre dos personas nadie contesta', () => {
    const state = engine.applyMove(nueva(3, 'd', DUO_MODE), { column: 3 });
    expect(state.board.filter((cell) => cell !== null)).toHaveLength(1);
    expect(state.turn).toBe('yellow');
  });

  /* El shell no puede tutear cuando hay dos personas mirando la misma pantalla,
     así que el título de la victoria lo escribe el juego. */
  it('entre dos personas la victoria dice QUIÉN ganó', () => {
    const status = engine.checkStatus(jugar([0, 0, 1, 1, 2, 2, 3]));
    expect(status.kind === 'won' && status.winner).toBe('Ganan las rojas');
  });
});

describe('la máquina', () => {
  const config = (sharpness: number): ConnectFourConfig => ({ sharpness, vsMachine: true });

  it('cierra cuando puede cerrar', () => {
    let board: Board = Array.from({ length: 42 }, () => null);
    for (const col of [1, 2, 3]) board = drop(board, col, 'yellow');

    expect(machineMove(board, 'yellow', config(1), 'z', 0)).toBe(4);
  });

  it('tapa cuando le van a cerrar', () => {
    let board: Board = Array.from({ length: 42 }, () => null);
    // Contra la pared: rojas en 0, 1 y 2 amenazan SOLO por el 3.
    for (const col of [0, 1, 2]) board = drop(board, col, 'red');

    expect(machineMove(board, 'yellow', config(1), 'z', 0)).toBe(3);
  });

  /*
   * Y si la amenaza es doble, no hay nada que tapar.
   *
   * Rojas en 1, 2 y 3 cierran por el 0 y por el 4 a la vez. Es la jugada que
   * gana partidas de verdad, y sirve de recordatorio para el test de arriba:
   * pedirle a la máquina que "tape" acá sería pedirle lo imposible.
   */
  it('no finge que puede tapar una amenaza doble', () => {
    let board: Board = Array.from({ length: 42 }, () => null);
    for (const col of [1, 2, 3]) board = drop(board, col, 'red');

    const tapa = machineMove(board, 'yellow', config(1), 'z', 0);
    const despues = drop(board, tapa, 'yellow');
    const puntas = [0, 4].filter((col) => winningLine(drop(despues, col, 'red')) !== null);
    expect(puntas.length, 'la amenaza doble debería seguir viva').toBeGreaterThan(0);
  });

  /*
   * La escala no va para atrás: cada nivel le gana al de abajo.
   *
   * Costó llegar acá y por eso queda fijado. Hubo dos versiones que se
   * invertían y ninguna se veía leyendo el código: una porque la bonificación
   * por profundidad tenía el signo cambiado —la máquina prefería ganar lo más
   * tarde posible y el nivel 4 perdía todas—, y otra por el efecto de paridad,
   * que hacía que buscar a profundidad 6 jugara PEOR que a 5.
   */
  it('cada nivel le gana al de abajo', () => {
    const duelo = (a: ConnectFourConfig, b: ConnectFourConfig, seed: string): string => {
      let board: Board = Array.from({ length: 42 }, () => null);
      let turnoA = true;
      for (let ply = 0; ply < 42; ply += 1) {
        const libres = openColumns(board);
        if (libres.length === 0) return 'nadie';
        const disc = turnoA ? 'red' : 'yellow';
        const col = machineMove(board, disc, turnoA ? a : b, `${seed}-${String(turnoA)}`, ply);
        board = drop(board, col < 0 ? (libres[0] as number) : col, disc);
        if (winningLine(board) !== null) return turnoA ? 'a' : 'b';
        turnoA = !turnoA;
      }
      return 'nadie';
    };

    const cfg = (d: Difficulty) => engine.getDifficultyConfig(d, 'machine');

    for (const alto of [2, 3, 4, 5] as Difficulty[]) {
      const bajo = (alto - 1) as Difficulty;
      let gana = 0;
      let pierde = 0;
      const N = 20;
      for (let k = 0; k < N; k += 1) {
        // Se alterna quién empieza: arrancar es una ventaja real acá.
        const altoPrimero = k % 2 === 0;
        const r = altoPrimero
          ? duelo(cfg(alto), cfg(bajo), `t${String(alto)}-${String(k)}`)
          : duelo(cfg(bajo), cfg(alto), `t${String(alto)}-${String(k)}`);
        if (altoPrimero ? r === 'a' : r === 'b') gana += 1;
        else if (altoPrimero ? r === 'b' : r === 'a') pierde += 1;
      }

      expect(
        gana,
        `el nivel ${String(alto)} no le gana al ${String(bajo)}: ${String(gana)}-${String(pierde)}`
      ).toBeGreaterThan(pierde);
    }
  });
});
