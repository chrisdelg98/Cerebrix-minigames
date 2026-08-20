import { describe, expect, it } from 'vitest';

import { snakeEngine as engine } from '@games/snake/engine/snakeEngine';
import { type SnakeState } from '@games/snake/engine/types';

/** Un tablero armado a mano, para que el reloj sea el único que mueve algo. */
function board(over: Partial<SnakeState> = {}): SnakeState {
  return {
    cols: 5,
    rows: 5,
    body: [12, 11, 10],
    heading: 'right',
    pending: null,
    food: -1,
    target: 12,
    baseMs: 200,
    dead: false,
    seed: 'test',
    spawns: 0,
    ...over,
  };
}

describe('el reloj mueve, el jugador dobla', () => {
  it('un paso avanza la cabeza y suelta la cola', () => {
    const next = engine.tick(board());
    expect(next.body).toEqual([13, 12, 11]);
  });

  it('girar no mueve: cambia hacia dónde va a mover el próximo paso', () => {
    const turned = engine.applyMove(board(), { heading: 'up' });
    expect(turned.body, 'girar movió la víbora').toEqual([12, 11, 10]);
    expect(turned.pending).toBe('up');

    expect(engine.tick(turned).body[0]).toBe(7);
  });

  /*
   * Sin esto, dos toques rápidos entre paso y paso te matan: arriba e izquierda
   * encolados dan media vuelta, y la muerte no se parece a nada que el jugador
   * haya visto.
   */
  it('rechaza el giro opuesto exacto', () => {
    expect(engine.applyMove(board(), { heading: 'left' }).pending).toBeNull();
    expect(engine.applyMove(board({ heading: 'up' }), { heading: 'down' }).pending).toBeNull();
  });

  it('encola un giro por paso, no dos', () => {
    const once = engine.applyMove(board(), { heading: 'up' });
    const twice = engine.applyMove(once, { heading: 'left' });
    // 'left' es el opuesto de 'right', que es hacia donde sigue mirando.
    expect(twice.pending).toBe('up');
  });
});

describe('lo que termina la partida', () => {
  it('la pared', () => {
    // Cabeza en la última columna, yendo a la derecha.
    const wall = board({ body: [14, 13, 12] });
    expect(engine.tick(wall).dead).toBe(true);
    expect(engine.checkStatus(engine.tick(wall)).kind).toBe('lost');
  });

  it('no se sale por el costado: la fila de al lado no es "adelante"', () => {
    const edge = board({ body: [9, 8, 7] });
    expect(engine.tick(edge).dead, 'cruzó de la fila 2 a la 3').toBe(true);
  });

  it('el propio cuerpo', () => {
    /*
     * En 5×5: la cabeza en 7 baja a 12, que es un segmento del medio. Hay uno
     * más atrás (11), así que soltar la cola no libera el 12 — es un choque de
     * verdad y no la cola yéndose.
     */
    const coiled = board({ body: [7, 8, 13, 12, 11], heading: 'left', pending: 'down' });
    expect(engine.tick(coiled).dead).toBe(true);
  });

  /*
   * La cola SE VA a mover, así que pisar donde estaba no es chocar. Tratarlo
   * como choque mata al jugador por algo que no pasó en pantalla.
   */
  it('pero no la casilla que la cola está dejando', () => {
    const chasing = board({ body: [12, 7, 6, 11], heading: 'right', pending: 'down' });
    const next = engine.tick(chasing);
    expect(next.dead, 'murió pisando una casilla que ya se había liberado').toBe(false);
  });
});

describe('comer', () => {
  it('crece sin soltar la cola y hace aparecer otra fruta', () => {
    const eating = board({ food: 13 });
    const next = engine.tick(eating);

    expect(next.body).toEqual([13, 12, 11, 10]);
    expect(next.food).not.toBe(13);
    expect(next.body).not.toContain(next.food);
  });

  it('acelera con cada fruta, con un piso', () => {
    const slow = engine.tickMs(board());
    const fast = engine.tickMs(board({ body: Array.from({ length: 20 }, (_, i) => i) }));
    expect(fast).toBeLessThan(slow);
    expect(
      engine.tickMs(board({ body: Array.from({ length: 400 }, (_, i) => i) }))
    ).toBeGreaterThanOrEqual(70);
  });

  it('gana al llegar al largo que pide el nivel', () => {
    const done = board({ body: Array.from({ length: 12 }, (_, i) => i), target: 12 });
    expect(engine.checkStatus(done)).toEqual({ kind: 'won', score: 12 });
  });
});

describe('el contrato arcade', () => {
  it('tick no muta el estado que recibe', () => {
    const state = board({ food: 13 });
    const copy = JSON.parse(JSON.stringify(state)) as SnakeState;
    engine.tick(state);
    expect(state).toEqual(copy);
  });

  it('arranca de tres, en el medio y con lugar por delante', () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      const config = engine.getDifficultyConfig(level);
      const state = engine.createInitialState(config, 'arranque');

      expect(state.body).toHaveLength(3);
      expect(state.heading).toBe('right');
      expect(state.body).not.toContain(state.food);
      // Medio tablero por delante antes de la primera pared.
      expect((state.body[0] ?? 0) % state.cols).toBeLessThan(state.cols - 1);
    }
  });

  it('la misma semilla da la misma partida', () => {
    const config = engine.getDifficultyConfig(3);
    expect(engine.createInitialState(config, 'x')).toEqual(engine.createInitialState(config, 'x'));
  });
});
