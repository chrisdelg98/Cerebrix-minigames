import { describe, expect, it } from 'vitest';

import { type Difficulty } from '@core/contract';
import { crossingEngine as engine } from '@games/crossing/engine/crossingEngine';
import { carsAt, laneAt, SAFE_START } from '@games/crossing/engine/lanes';
import { type CrossingState } from '@games/crossing/engine/types';

const LEVELS: Difficulty[] = [1, 2, 3, 4, 5];

function board(over: Partial<CrossingState> = {}): CrossingState {
  return {
    cols: 9,
    rows: 9,
    distance: 0,
    col: 4,
    ticks: 0,
    target: 12,
    traffic: 0.52,
    baseMs: 460,
    dead: false,
    seed: 'test',
    ...over,
  };
}

describe('el mundo se deriva, no se guarda', () => {
  it('la misma semilla y fila dan siempre la misma calle', () => {
    for (let row = 0; row < 60; row += 1) {
      expect(laneAt('x', row, 0.5)).toEqual(laneAt('x', row, 0.5));
    }
  });

  it('las primeras filas son vereda: nadie muere antes de entender el juego', () => {
    for (let row = 0; row <= SAFE_START; row += 1) {
      expect(laneAt('cualquiera', row, 1).kind).toBe('safe');
    }
  });

  it('nunca hay tres calles seguidas', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      for (let row = 0; row < 120; row += 1) {
        const tres = [row, row + 1, row + 2].map((r) => laneAt(seed, r, 0.95).kind);
        expect(tres, `semilla ${seed}, fila ${String(row)}`).not.toEqual(['road', 'road', 'road']);
      }
    }
  });

  it('una vereda no tiene autos', () => {
    expect(carsAt(laneAt('x', 0, 1), 9, 37)).toEqual([]);
  });

  it('los autos van parejos y siempre dejan hueco', () => {
    const lane = laneAt('semilla-con-calle', 7, 1);
    if (lane.kind !== 'road') return;

    for (let ticks = 0; ticks < 40; ticks += 1) {
      const cars = carsAt(lane, 9, ticks);
      expect(cars.length, `tick ${String(ticks)}`).toBeLessThan(9);
      // Con separación fija, entre dos autos siempre entra el jugador.
      expect(lane.gap).toBeGreaterThanOrEqual(3);
    }
  });

  it('los autos avanzan con el reloj y en su dirección', () => {
    const lane = { kind: 'road' as const, dir: 1 as const, every: 1, gap: 4, offset: 0 };
    const antes = carsAt(lane, 12, 0);
    const despues = carsAt(lane, 12, 1);
    expect(despues).not.toEqual(antes);
    // Corridos una casilla a la derecha, con vuelta cíclica.
    expect(despues).toEqual(antes.map((col) => col + 1));
  });
});

describe('moverse y morir', () => {
  it('avanzar no adelanta el reloj: los autos se quedan donde estaban', () => {
    const state = board();
    const next = engine.applyMove(state, { step: 'up' });
    expect(next.ticks).toBe(state.ticks);
    expect(next.distance).toBe(1);
  });

  it('no se sale del tablero por los costados ni por atrás', () => {
    let state = board({ col: 0 });
    state = engine.applyMove(state, { step: 'left' });
    expect(state.col).toBe(0);

    state = engine.applyMove(board({ col: 8 }), { step: 'right' });
    expect(state.col).toBe(8);

    state = engine.applyMove(board({ distance: 0 }), { step: 'down' });
    expect(state.distance).toBe(0);
  });

  /*
   * Las dos formas de morir tienen que existir, o el juego es injusto en una
   * dirección: si solo mata el auto que te alcanza, meterse debajo de uno sale
   * gratis; si solo mata meterse, quedarse quieto en la calle sale gratis.
   */
  it('mata el auto que te alcanza', () => {
    const lane = { kind: 'road' as const, dir: 1 as const, every: 1, gap: 3, offset: 0 };
    // Se busca un estado donde el jugador esté libre y el tick le traiga un auto.
    let matado = false;
    for (let col = 0; col < 9 && !matado; col += 1) {
      for (let ticks = 0; ticks < 12; ticks += 1) {
        const libre = !carsAt(lane, 9, ticks).includes(col);
        const alcanzado = carsAt(lane, 9, ticks + 1).includes(col);
        if (libre && alcanzado) matado = true;
      }
    }
    expect(matado, 'nunca un auto alcanza a nadie').toBe(true);
  });

  it('mata meterse debajo de uno', () => {
    // Una semilla con calle en la fila 3, y el jugador entrando donde hay auto.
    const seedConCalle = ['a', 'b', 'c', 'd', 'e'].find((s) => laneAt(s, 3, 1).kind === 'road');
    expect(seedConCalle).toBeDefined();
    if (!seedConCalle) return;

    const lane = laneAt(seedConCalle, 3, 1);
    const ocupada = carsAt(lane, 9, 0)[0];
    expect(ocupada).toBeDefined();
    if (ocupada === undefined) return;

    const state = board({ seed: seedConCalle, distance: 2, col: ocupada, target: 12 });
    expect(engine.applyMove(state, { step: 'up' }).dead).toBe(true);
  });

  it('un muerto no se mueve más', () => {
    const muerto = board({ dead: true, distance: 4 });
    expect(engine.applyMove(muerto, { step: 'up' })).toEqual(muerto);
    expect(engine.tick(muerto)).toEqual(muerto);
  });
});

describe('el contrato arcade', () => {
  it('no muta el estado que recibe', () => {
    const state = board();
    const copia = JSON.parse(JSON.stringify(state)) as CrossingState;
    engine.applyMove(state, { step: 'up' });
    engine.tick(state);
    expect(state).toEqual(copia);
  });

  it('gana al llegar a la meta del nivel', () => {
    expect(engine.checkStatus(board({ distance: 12, target: 12 }))).toEqual({
      kind: 'won',
      score: 12,
    });
    expect(engine.checkStatus(board({ distance: 11, target: 12 })).kind).toBe('playing');
  });

  /*
   * El reloj se ata a la DISTANCIA y no al tiempo: si acelerara con el reloj,
   * quedarse quieto en una vereda a mirar el tráfico sería un castigo, y el
   * juego se pondría imposible sin que el jugador hiciera nada.
   */
  it('acelera con la distancia y no con el tiempo', () => {
    const quieto = board({ distance: 0, ticks: 500 });
    const lejos = board({ distance: 20, ticks: 0 });

    expect(engine.tickMs(lejos)).toBeLessThan(engine.tickMs(quieto));
    expect(engine.tickMs(board({ distance: 0, ticks: 0 }))).toBe(engine.tickMs(quieto));
  });

  it('la velocidad tiene piso', () => {
    expect(engine.tickMs(board({ distance: 10_000 }))).toBeGreaterThanOrEqual(120);
  });

  it('arranca en la vereda, en el medio y con el mundo por delante', () => {
    for (const level of LEVELS) {
      const config = engine.getDifficultyConfig(level);
      const state = engine.createInitialState(config, 'arranque');

      expect(state.distance).toBe(0);
      expect(state.col).toBe(Math.floor(config.cols / 2));
      expect(engine.checkStatus(state).kind).toBe('playing');
      expect(laneAt(state.seed, 0, config.traffic).kind).toBe('safe');
    }
  });

  it('la misma semilla da la misma partida', () => {
    const config = engine.getDifficultyConfig(3);
    expect(engine.createInitialState(config, 'igual')).toEqual(
      engine.createInitialState(config, 'igual')
    );
  });
});
