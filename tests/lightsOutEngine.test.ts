import { describe, expect, it } from 'vitest';

import { lightsOutEngine as engine } from '@games/lights-out/engine/lightsOutEngine';
import { affected, solve, toggle } from '@games/lights-out/engine/lights';
import { type LightsOutState } from '@games/lights-out/engine/types';

import { type Difficulty } from '@core/contract';

const LEVELS: Difficulty[] = [1, 2, 3, 4, 5];

const allOff = (state: LightsOutState) => state.lights.every((on) => !on);

describe('el toque', () => {
  it('da vuelta la casilla y sus cuatro vecinas ortogonales', () => {
    // En un 3×3: el centro toca cinco, un borde cuatro, una esquina tres.
    expect(affected(4, 3).sort((a, b) => a - b)).toEqual([1, 3, 4, 5, 7]);
    expect(affected(1, 3).sort((a, b) => a - b)).toEqual([0, 1, 2, 4]);
    expect(affected(0, 3).sort((a, b) => a - b)).toEqual([0, 1, 3]);
  });

  it('no se sale por el costado del tablero', () => {
    // La 3 es el borde izquierdo de la fila 2: no puede alcanzar la 2, que es
    // la punta derecha de la fila 1 aunque sea el índice anterior.
    expect(affected(3, 3)).not.toContain(2);
    expect(affected(5, 3)).not.toContain(6);
  });

  it('tocar dos veces la misma casilla deja el tablero como estaba', () => {
    const start = [true, false, true, false, true, false, true, false, true];
    expect(toggle(toggle(start, 4, 3), 4, 3)).toEqual(start);
  });
});

describe('el tablero generado', () => {
  /*
   * La propiedad que hace barato a este juego.
   *
   * Se genera al revés — toques sobre un tablero apagado — así que la solución
   * existe por construcción y no hay que verificar nada al generar. Este test
   * es el que sostiene esa afirmación: en cada nivel y con muchas semillas, el
   * solucionador encuentra una respuesta y esa respuesta apaga todo.
   */
  it('siempre se puede apagar, en todos los niveles', () => {
    for (const level of LEVELS) {
      const config = engine.getDifficultyConfig(level);

      for (let i = 0; i < 40; i += 1) {
        const state = engine.createInitialState(
          config,
          `semilla-${String(level)}-${String(i)}`
        ) as LightsOutState;

        const solution = solve(state.lights, state.size);
        expect(solution, `nivel ${String(level)}, semilla ${String(i)}`).not.toBeNull();

        const done = (solution ?? []).reduce(
          (lights, index) => toggle(lights, index, state.size),
          state.lights
        );
        expect(
          done.every((on) => !on),
          `nivel ${String(level)}, semilla ${String(i)}`
        ).toBe(true);
      }
    }
  });

  it('nunca entrega una partida ya ganada', () => {
    for (const level of LEVELS) {
      const config = engine.getDifficultyConfig(level);
      for (let i = 0; i < 25; i += 1) {
        const state = engine.createInitialState(
          config,
          `arranque-${String(level)}-${String(i)}`
        ) as LightsOutState;
        expect(allOff(state)).toBe(false);
      }
    }
  });

  it('la misma semilla da el mismo tablero', () => {
    const config = engine.getDifficultyConfig(3);
    const a = engine.createInitialState(config, 'igual') as LightsOutState;
    const b = engine.createInitialState(config, 'igual') as LightsOutState;
    expect(a).toEqual(b);
  });
});

describe('el solucionador', () => {
  /*
   * Un 5×5 tiene tableros que NO se pueden apagar: el sistema es singular y
   * hay configuraciones fuera de su imagen. El motor no los genera nunca, pero
   * un estado que vuelve del guardado es un dato de afuera.
   */
  it('devuelve null cuando el tablero no tiene solución', () => {
    const unsolvable = Array.from({ length: 25 }, (_, lit) => {
      const lights = Array.from({ length: 25 }, () => false);
      lights[lit] = true;
      return solve(lights, 5);
    }).filter((result) => result === null);

    expect(unsolvable.length).toBeGreaterThan(0);
  });

  it('no toca el tablero que recibe', () => {
    const lights = [true, false, true, false, true, false, true, false, true];
    const copy = [...lights];
    solve(lights, 3);
    expect(lights).toEqual(copy);
  });
});

describe('el contrato', () => {
  it('applyMove no muta el estado que recibe', () => {
    const state: LightsOutState = {
      size: 3,
      lights: Array.from({ length: 9 }, () => true),
      moves: 0,
    };
    const copy = JSON.parse(JSON.stringify(state)) as LightsOutState;

    engine.applyMove(state, { index: 4 });

    expect(state).toEqual(copy);
  });

  it('gana cuando no queda ninguna encendida, y no antes', () => {
    const off: LightsOutState = {
      size: 3,
      lights: Array.from({ length: 9 }, () => false),
      moves: 7,
    };
    expect(engine.checkStatus(off)).toEqual({ kind: 'won', score: 7 });

    const on: LightsOutState = { ...off, lights: [...off.lights.slice(1), true] };
    expect(engine.checkStatus(on).kind).toBe('playing');
  });

  it('no se puede perder: no hay estado perdido', () => {
    const revuelto: LightsOutState = {
      size: 3,
      lights: Array.from({ length: 9 }, () => true),
      moves: 99,
    };
    expect(engine.checkStatus(revuelto).kind).not.toBe('lost');
  });

  it('la pista señala un toque que forma parte de una solución', () => {
    const config = engine.getDifficultyConfig(4);
    const state = engine.createInitialState(config, 'pista') as LightsOutState;

    const hint = engine.getHint?.(state);
    expect(hint).not.toBeNull();

    const cell = hint?.cells[0];
    const index = (cell?.row ?? 0) * state.size + (cell?.col ?? 0);
    // Tocando lo que dice, el tablero sigue teniendo solución y con un paso menos.
    const after = toggle(state.lights, index, state.size);
    expect(solve(after, state.size)?.length).toBe(
      (solve(state.lights, state.size) ?? []).length - 1
    );
  });

  it('sobrevive a un viaje por el guardado', () => {
    const config = engine.getDifficultyConfig(2);
    const state = engine.createInitialState(config, 'guardado') as LightsOutState;
    expect(engine.deserialize(engine.serialize(state), 1)).toEqual(state);
  });

  it('mide el avance en luces apagadas', () => {
    const half: LightsOutState = {
      size: 3,
      lights: [true, true, true, true, false, false, false, false, false],
      moves: 0,
    };
    expect(engine.getProgress(half)).toBeCloseTo(5 / 9, 5);
  });
});
