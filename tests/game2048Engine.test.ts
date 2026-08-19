import { describe, expect, it } from 'vitest';

import { game2048Engine as engine } from '@games/2048/engine/game2048Engine';
import { type Game2048State } from '@games/2048/engine/types';

/**
 * El motor de 2048: lógica pura, sin DOM y sin reloj.
 *
 * Lo que más se verifica acá es la PUREZA, porque de ella dependen tres cosas
 * del shell que el juego no controla: deshacer, rehacer y el autoguardado.
 */

function board(tiles: number[], extra: Partial<Game2048State> = {}): Game2048State {
  return {
    size: Math.sqrt(tiles.length),
    tiles,
    target: 2048,
    score: 0,
    seed: 'test',
    spawns: 0,
    ...extra,
  };
}

describe('deslizar y fusionar', () => {
  it('empuja todo hacia el lado elegido', () => {
    const state = board([0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const next = engine.applyMove(state, { dir: 'left' });
    expect(next.tiles[0]).toBe(2);
  });

  it('fusiona dos iguales en una que vale el doble y suma esos puntos', () => {
    const state = board([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const next = engine.applyMove(state, { dir: 'left' });
    expect(next.tiles[0]).toBe(4);
    expect(next.score).toBe(4);
  });

  it('fusiona cada ficha UNA sola vez por jugada: 2·2·2·2 da 4·4, no 8', () => {
    const state = board([2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const next = engine.applyMove(state, { dir: 'left' });
    expect(next.tiles.slice(0, 4)).toEqual([4, 4, 0, 0]);
    expect(next.score).toBe(8);
  });

  it('fusiona el par más lejano primero, del lado al que se empuja', () => {
    // Empujando a la derecha, los dos de la derecha son los que se juntan.
    const state = board([4, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const next = engine.applyMove(state, { dir: 'right' });
    expect(next.tiles.slice(0, 4)).toEqual([0, 4, 2, 4]);
  });

  it('mueve columnas igual que filas', () => {
    const state = board([2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const next = engine.applyMove(state, { dir: 'up' });
    expect(next.tiles[0]).toBe(4);
  });
});

describe('el contrato que el shell da por sentado', () => {
  it('no toca el estado que recibe', () => {
    const tiles = [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const state = board([...tiles]);
    const copy = JSON.parse(JSON.stringify(state)) as Game2048State;

    engine.applyMove(state, { dir: 'left' });

    expect(state).toEqual(copy);
  });

  /*
   * Sin esto no hay deshacer.
   *
   * La ficha nueva sale de (semilla, contador de apariciones), las dos adentro
   * del estado. Si saliera de Math.random(), volver atrás y rehacer la misma
   * jugada daría otro tablero, y el guardado describiría una partida distinta
   * de la que se estaba jugando.
   */
  it('da exactamente el mismo tablero para la misma jugada sobre el mismo estado', () => {
    const state = board([2, 2, 4, 0, 0, 8, 0, 2, 0, 0, 0, 0, 4, 0, 0, 0]);

    const a = engine.applyMove(state, { dir: 'left' });
    const b = engine.applyMove(state, { dir: 'left' });

    expect(a).toEqual(b);
  });

  it('sobrevive a un viaje por el guardado', () => {
    const state = engine.applyMove(board([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), {
      dir: 'left',
    });

    expect(engine.deserialize(engine.serialize(state), 1)).toEqual(state);
  });
});

describe('jugadas rechazadas', () => {
  it('rechaza el lado por el que no se mueve nada', () => {
    const state = board([2, 4, 8, 16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    // A la izquierda ya están pegadas y ninguna fusiona: la jugada no hace nada.
    expect(engine.validate(state, { dir: 'left' })).toEqual({
      ok: false,
      reason: 'Para ese lado no se mueve nada.',
    });
    expect(engine.validate(state, { dir: 'down' }).ok).toBe(true);
  });
});

describe('final de partida', () => {
  it('gana al alcanzar la ficha que pide el nivel', () => {
    const state = board([256, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], {
      target: 256,
      score: 120,
    });
    expect(engine.checkStatus(state)).toEqual({ kind: 'won', score: 120 });
  });

  it('sigue en juego mientras falte llegar a la meta', () => {
    const state = board([128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { target: 256 });
    expect(engine.checkStatus(state).kind).toBe('playing');
  });

  it('pierde solo cuando el tablero está lleno y ningún lado mueve nada', () => {
    const trabado = board([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    expect(engine.checkStatus(trabado).kind).toBe('lost');

    // Lleno pero con un par pegado: todavía hay jugada.
    const conSalida = board([2, 2, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    expect(engine.checkStatus(conSalida).kind).toBe('playing');
  });
});

/*
 * Las figuras de "cómo se juega" dibujan reglas, y una regla dibujada mal es
 * peor que no dibujarla: el jugador la aprende al revés y culpa al juego. Cada
 * figura de Examples.tsx tiene su fila acá, con el mismo antes y el mismo
 * después, verificados contra el motor de verdad.
 */
describe('los ejemplos de cómo se juega dicen la verdad', () => {
  /**
   * La primera fila después de empujar a la derecha, sin la ficha que aparece.
   *
   * `applyMove` desliza Y hace aparecer una ficha, así que mirar la fila sin
   * más mezcla las dos cosas y el test pasaría o fallaría según dónde caiga el
   * azar. Empujar en horizontal no saca nada de su fila, así que con el resto
   * del tablero vacío la aparición es la ÚNICA casilla ocupada fuera de la
   * primera fila — y si no lo es, el test lo dice en vez de comparar de más.
   */
  const pushRight = (values: number[]) => {
    const state = board([...values, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const after = engine.applyMove(state, { dir: 'right' });

    const elsewhere = after.tiles.slice(4).filter((value) => value !== 0);
    expect(elsewhere, 'la ficha nueva cayó en la fila que se está comparando').toHaveLength(1);

    return after.tiles.slice(0, 4);
  };

  it('MergeExample: 2·2 empujado a la derecha da un 4', () => {
    expect(pushRight([2, 2, 0, 0])).toEqual([0, 0, 0, 4]);
  });

  it('DifferentExample: 2·4 se corren pero no se fusionan', () => {
    expect(pushRight([2, 4, 0, 0])).toEqual([0, 0, 2, 4]);
  });

  it('OnceExample: 2·2·2·2 da dos cuatros, no un ocho', () => {
    expect(pushRight([2, 2, 2, 2])).toEqual([0, 0, 4, 4]);
  });
});

describe('el arranque y la escala', () => {
  it('empieza con dos fichas, para que la primera jugada tenga con qué fusionar', () => {
    const config = engine.getDifficultyConfig(1);
    const state = engine.createInitialState(config, 'semilla') as Game2048State;

    expect(state.tiles.filter((v) => v !== 0)).toHaveLength(2);
    expect(state.tiles.every((v) => v === 0 || v === 2 || v === 4)).toBe(true);
    expect(state.spawns).toBe(2);
  });

  it('mueve la meta y no el tamaño del tablero', () => {
    const targets = ([1, 2, 3, 4, 5] as const).map((d) => engine.getDifficultyConfig(d));
    // Empieza en 128 para que el primer nivel se gane rápido, y termina en
    // 2048: el nivel más alto es la partida que le da nombre al juego.
    expect(targets.map((c) => c.target)).toEqual([128, 256, 512, 1024, 2048]);
    // Un tablero más grande sería MÁS fácil: más lugar es más margen de error.
    expect(targets.every((c) => c.size === 4)).toBe(true);
  });

  it('mide el avance en duplicaciones, no en fichas', () => {
    const at = (max: number) =>
      engine.getProgress(
        board([max, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], { target: 512 })
      );

    expect(at(2)).toBe(0);
    expect(at(512)).toBe(1);
    // De 2 a 512 hay ocho duplicaciones; 32 son cuatro, o sea la mitad exacta.
    // En fichas 32 no se parece a la mitad de 512 — esa distancia es el punto.
    expect(at(32)).toBeCloseTo(0.5, 5);
  });

  it('no ofrece pista: la única posible sería jugar en lugar del jugador', () => {
    // `getHint` no está declarado, y su ausencia es lo que apaga el botón.
    expect('getHint' in engine).toBe(false);
  });
});
