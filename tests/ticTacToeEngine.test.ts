import { describe, expect, it } from 'vitest';

import { type Difficulty } from '@core/contract';
import { DUO_MODE, ticTacToeEngine as engine } from '@games/tic-tac-toe/engine/ticTacToeEngine';
import { freeCells, ranked, winningLine } from '@games/tic-tac-toe/engine/machine';
import { type TicTacToeState } from '@games/tic-tac-toe/engine/types';

function nueva(difficulty: Difficulty, seed: string, mode = 'machine'): TicTacToeState {
  // El contrato permite crear el estado de forma asíncrona; este juego no lo
  // necesita, así que acá siempre es el estado y no una promesa.
  return engine.createInitialState(
    engine.getDifficultyConfig(difficulty, mode),
    seed
  ) as TicTacToeState;
}

/**
 * Juega la partida entera con X eligiendo SIEMPRE la mejor jugada posible.
 *
 * Perfecto de verdad —el mismo minimax que usa la máquina— y no una heurística
 * de "gano, tapo, centro". Con la heurística el nivel 5 daba cero victorias y
 * parecía imposible de ganar, pero la culpa era del jugador de prueba, que no
 * sabe armar una horquilla: contra un rival que siempre tapa, la única forma de
 * ganar es amenazar por dos lados a la vez. Medir la dificultad con un jugador
 * mediocre mide al jugador, no al nivel.
 */
function partidaOptima(difficulty: Difficulty, seed: string): 'won' | 'lost' | 'draw' {
  let state = nueva(difficulty, seed);

  while (engine.checkStatus(state).kind === 'playing') {
    const mejor = ranked(state.board, 'x')[0];
    if (mejor === undefined) break;
    state = engine.applyMove(state, { cell: mejor.cell });
  }

  const final = engine.checkStatus(state);
  return final.kind === 'playing' ? 'draw' : final.kind;
}

/**
 * Y una partida jugada COMO JUEGA UNA PERSONA: cierro si puedo, tapo si me van
 * a ganar, si no agarro el centro.
 *
 * Hacen falta las dos varas porque miden cosas distintas. Si un nivel se puede
 * ganar es una pregunta sobre el techo del juego y solo la contesta el juego
 * perfecto. Si la escala sube parejo es una pregunta sobre la experiencia real,
 * y ahí el jugador impecable miente: la inversión que tenía esta escala —el
 * nivel 3 más fácil que el 2— era invisible contra minimax y evidente contra
 * alguien normal, que es quien va a jugar.
 */
function partidaHumana(difficulty: Difficulty, seed: string): 'won' | 'lost' | 'draw' {
  let state = nueva(difficulty, seed);

  while (engine.checkStatus(state).kind === 'playing') {
    const elegida = freeCells(state.board)
      .map((cell) => ({ cell, valor: instinto(state.board, cell) }))
      .sort((a, b) => b.valor - a.valor)[0];
    if (elegida === undefined) break;
    state = engine.applyMove(state, { cell: elegida.cell });
  }

  const final = engine.checkStatus(state);
  return final.kind === 'playing' ? 'draw' : final.kind;
}

function instinto(board: TicTacToeState['board'], cell: number): number {
  const cierro = board.slice();
  cierro[cell] = 'x';
  if (winningLine(cierro) !== null) return 3;

  const tapo = board.slice();
  tapo[cell] = 'o';
  if (winningLine(tapo) !== null) return 2;

  return cell === 4 ? 1 : 0;
}

const SEMILLAS = Array.from({ length: 60 }, (_, i) => `s-${String(i)}`);

/** Cuántas de las 60 partidas gana un jugador impecable contra ese nivel. */
function victorias(difficulty: Difficulty): number {
  return SEMILLAS.filter((seed) => partidaOptima(difficulty, seed) === 'won').length;
}

/** Lo mismo, pero con el jugador de instinto: así se ve la escala real. */
function victoriasHumanas(difficulty: Difficulty): number {
  return SEMILLAS.filter((seed) => partidaHumana(difficulty, seed) === 'won').length;
}

function derrotasHumanas(difficulty: Difficulty): number {
  return SEMILLAS.filter((seed) => partidaHumana(difficulty, seed) === 'lost').length;
}

const NIVELES: Difficulty[] = [1, 2, 3, 4, 5];

describe('las reglas', () => {
  it('tres en línea gana y deja marcada la línea', () => {
    // Dos jugadores, para que la máquina no conteste entre medio.
    let state = nueva(3, 'reglas', DUO_MODE);
    for (const cell of [0, 3, 1, 4, 2]) state = engine.applyMove(state, { cell });

    const status = engine.checkStatus(state);
    expect(status.kind).toBe('won');
    expect(state.line).toEqual([0, 1, 2]);
  });

  it('el tablero lleno sin línea es EMPATE, no derrota', () => {
    let state = nueva(3, 'empate', DUO_MODE);
    // x o x / x o o / o x x — lleno y sin ninguna línea.
    for (const cell of [0, 1, 2, 4, 3, 5, 7, 6, 8]) state = engine.applyMove(state, { cell });

    expect(freeCells(state.board)).toHaveLength(0);
    expect(engine.checkStatus(state).kind).toBe('draw');
  });

  it('no deja poner sobre una casilla ocupada', () => {
    const state = engine.applyMove(nueva(3, 'ocupada', DUO_MODE), { cell: 4 });
    expect(engine.validate(state, { cell: 4 }).ok).toBe(false);
  });
});

describe('los cinco niveles', () => {
  /*
   * El nivel 2 es "solo ve la jugada que tiene delante". Lo que SÍ tiene que
   * ver es que le van a ganar: si no tapa, no es un nivel, es el nivel 1.
   */
  it('el nivel 2 tapa una línea a punto de cerrarse', () => {
    // X en 0 y 1: con 2 cierra. La máquina juega después de la de X.
    let state = nueva(2, 'tapa');
    state = engine.applyMove(state, { cell: 0 });
    // Se fuerza la amenaza para no depender de dónde contestó.
    const amenaza: TicTacToeState = {
      ...state,
      board: ['x', 'x', null, 'o', null, null, null, null, null],
      turn: 'x',
    };
    // Le toca a X pero se mide la respuesta de la máquina a una jugada inocua.
    const despues = engine.applyMove(amenaza, { cell: 6 });
    expect(despues.board[2], 'no tapó la línea que le iba a ganar').toBe('o');
  });

  /*
   * EL REQUISITO: el nivel 5 tiene que ser ganable.
   *
   * El tres en línea está resuelto, así que una máquina perfecta sería
   * imposible de ganar y ese nivel jamás daría un trofeo ni alimentaría una
   * racha. La máquina juega muy bien pero se equivoca, y jugando bien se le
   * gana algunas veces.
   */
  it('el nivel 5 se puede ganar', () => {
    expect(victorias(5), 'el nivel 5 resultó imposible de ganar').toBeGreaterThan(0);
  });

  /*
   * Y la escala no va para atrás, en ninguna de las dos lecturas.
   *
   * Que ahora se pueda afirmar tan fuerte es consecuencia del diseño: hay UNA
   * perilla, así que más `sharpness` es jugar mejor por definición. Las
   * versiones con dos mecanismos se cruzaban de formas que solo aparecían
   * midiendo — una dejó el nivel 3 más fácil que el 2, y otra dejó el 2 más
   * difícil que el 5 —, y ninguna de las dos se veía leyendo el código.
   *
   * Se miden los dos jugadores porque cada uno ve la mitad: uno dice si la
   * escala funciona para quien juega casual, el otro cuál es el techo real.
   */
  it('la escala no va para atrás', () => {
    const instinto = NIVELES.map(victoriasHumanas);
    const perdidas = NIVELES.map(derrotasHumanas);
    const experto = NIVELES.map(victorias);

    for (let i = 1; i < NIVELES.length; i += 1) {
      const paso = `del ${String(i)} al ${String(i + 1)}`;
      expect(instinto[i], `por instinto se gana más ${paso}: ${instinto.join(' ')}`).toBeLessThan(
        instinto[i - 1] ?? 0
      );
      expect(
        perdidas[i],
        `por instinto se pierde menos ${paso}: ${perdidas.join(' ')}`
      ).toBeGreaterThan(perdidas[i - 1] ?? 0);
      expect(experto[i], `jugando bien se gana más ${paso}: ${experto.join(' ')}`).toBeLessThan(
        experto[i - 1] ?? 0
      );
    }
  });

  /*
   * Y el nivel más alto se le gana también a quien juega por instinto, no solo
   * a un minimax. Un nivel que exige jugar perfecto para no perder nunca es,
   * para casi todo el mundo, un nivel que no se puede ganar.
   */
  it('hasta el nivel 5 se le gana jugando por instinto', () => {
    expect(victoriasHumanas(5), 'el nivel 5 solo lo gana un experto').toBeGreaterThan(0);
  });
});

describe('los dos modos', () => {
  it('contra la máquina, ella contesta en la misma jugada', () => {
    const state = engine.applyMove(nueva(3, 'contesta'), { cell: 4 });
    expect(freeCells(state.board), 'la máquina no respondió').toHaveLength(7);
  });

  it('entre dos personas nadie contesta: la ficha es una sola', () => {
    const state = engine.applyMove(nueva(3, 'duo', DUO_MODE), { cell: 4 });
    expect(freeCells(state.board)).toHaveLength(8);
    expect(state.turn).toBe('o');
  });

  /* El shell no puede tutear a nadie cuando hay dos personas mirando la misma
     pantalla, así que el juego escribe el título de la victoria. */
  it('entre dos personas la victoria dice QUIÉN ganó', () => {
    let state = nueva(3, 'quien', DUO_MODE);
    for (const cell of [0, 3, 1, 4, 2]) state = engine.applyMove(state, { cell });

    const status = engine.checkStatus(state);
    expect(status.kind === 'won' && status.winner).toBe('Ganan las X');
  });

  it('contra la máquina no manda ganador: ahí ganar es del jugador', () => {
    let state = nueva(1, 'tuteo');
    while (engine.checkStatus(state).kind === 'playing') {
      const libre = freeCells(state.board)[0];
      if (libre === undefined) break;
      state = engine.applyMove(state, { cell: libre });
    }
    const status = engine.checkStatus(state);
    if (status.kind === 'won') expect(status.winner).toBeUndefined();
  });
});
