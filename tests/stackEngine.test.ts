import { describe, expect, it } from 'vitest';

import { type Difficulty } from '@core/contract';
import { stackEngine as engine } from '@games/stack/engine/stackEngine';
import { type StackState } from '@games/stack/engine/types';

const LEVELS: Difficulty[] = [1, 2, 3, 4, 5];

function board(over: Partial<StackState> = {}): StackState {
  return {
    slots: 32,
    tower: [{ start: 10, width: 12 }],
    moving: { start: 10, width: 12, dir: 1 },
    target: 10,
    fullWidth: 12,
    streak: 0,
    baseMs: 130,
    dead: false,
    ...over,
  };
}

const drop = (state: StackState) => engine.applyMove(state, { kind: 'drop' });

describe('el bloque que se desliza', () => {
  it('avanza una ranura por paso', () => {
    expect(engine.tick(board()).moving.start).toBe(11);
  });

  it('rebota en el borde derecho sin quedarse pegado', () => {
    // start + width = 32, o sea contra el borde.
    const borde = board({ moving: { start: 20, width: 12, dir: 1 } });
    const next = engine.tick(borde);

    expect(next.moving.dir).toBe(-1);
    expect(next.moving.start, 'se quedó clavado en el borde').toBe(19);
  });

  it('rebota en el borde izquierdo', () => {
    const borde = board({ moving: { start: 0, width: 12, dir: -1 } });
    const next = engine.tick(borde);

    expect(next.moving.dir).toBe(1);
    expect(next.moving.start).toBe(1);
  });

  it('nunca se sale del tablero', () => {
    let state = board({ moving: { start: 0, width: 12, dir: -1 } });
    for (let i = 0; i < 200; i += 1) {
      state = engine.tick(state);
      expect(state.moving.start).toBeGreaterThanOrEqual(0);
      expect(state.moving.start + state.moving.width).toBeLessThanOrEqual(32);
    }
  });
});

describe('apoyar', () => {
  it('lo que sobresale se cae, y con eso se sigue jugando', () => {
    // Corrido cuatro ranuras: se superponen ocho de doce.
    const state = board({ moving: { start: 14, width: 12, dir: 1 } });
    const next = drop(state);

    const puesta = next.tower[next.tower.length - 1];
    expect(puesta).toEqual({ start: 14, width: 8 });
    expect(next.moving.width, 'el siguiente no heredó el ancho recortado').toBe(8);
  });

  it('sin superposición se termina la partida', () => {
    // Totalmente a un lado de la pieza de abajo.
    const state = board({
      tower: [{ start: 0, width: 8 }],
      moving: { start: 20, width: 8, dir: 1 },
    });
    expect(drop(state).dead).toBe(true);
    expect(engine.checkStatus(drop(state)).kind).toBe('lost');
  });

  it('tocar el borde exacto todavía cuenta', () => {
    // Una sola ranura de superposición: lo mínimo que sigue siendo apoyo.
    const state = board({
      tower: [{ start: 0, width: 8 }],
      moving: { start: 7, width: 8, dir: 1 },
    });
    const next = drop(state);

    expect(next.dead).toBe(false);
    expect(next.tower[next.tower.length - 1]).toEqual({ start: 7, width: 1 });
  });

  /*
   * Sin la devolución, la torre solo se puede angostar: cada partida tendría un
   * techo fijo por más bien que se jugara, y la habilidad decidiría cuándo
   * perdés pero nunca si podés remontar.
   */
  it('el apoyo perfecto devuelve una ranura', () => {
    const state = board({
      tower: [{ start: 10, width: 10 }],
      moving: { start: 10, width: 10, dir: 1 },
    });
    const next = drop(state);

    expect(next.tower[next.tower.length - 1]?.width).toBe(11);
    expect(next.streak).toBe(1);
  });

  it('pero nunca por encima del ancho original', () => {
    const state = board({
      tower: [{ start: 10, width: 12 }],
      moving: { start: 10, width: 12, dir: 1 },
    });
    expect(drop(state).tower[1]?.width).toBe(12);
  });

  it('un apoyo torcido corta la racha', () => {
    const state = board({ streak: 4, moving: { start: 12, width: 12, dir: 1 } });
    expect(drop(state).streak).toBe(0);
  });

  it('el siguiente bloque entra por el lado contrario', () => {
    const derecha = drop(board({ moving: { start: 10, width: 12, dir: 1 } }));
    expect(derecha.moving.dir).toBe(-1);
    expect(derecha.moving.start + derecha.moving.width).toBe(32);

    const izquierda = drop(board({ moving: { start: 10, width: 12, dir: -1 } }));
    expect(izquierda.moving.dir).toBe(1);
    expect(izquierda.moving.start).toBe(0);
  });
});

describe('el contrato arcade', () => {
  it('no muta el estado que recibe', () => {
    const state = board();
    const copia = JSON.parse(JSON.stringify(state)) as StackState;
    engine.tick(state);
    drop(state);
    expect(state).toEqual(copia);
  });

  it('un muerto no se mueve más', () => {
    const muerto = board({ dead: true });
    expect(engine.tick(muerto)).toEqual(muerto);
    expect(drop(muerto)).toEqual(muerto);
  });

  it('gana al levantar los pisos que pide el nivel', () => {
    // La base no cuenta como piso: se empieza apoyado sobre ella.
    const alta = board({
      tower: Array.from({ length: 11 }, () => ({ start: 0, width: 8 })),
      target: 10,
    });
    expect(engine.checkStatus(alta)).toEqual({ kind: 'won', score: 10 });
    expect(
      engine.checkStatus(
        board({ tower: Array.from({ length: 10 }, () => ({ start: 0, width: 8 })) })
      ).kind
    ).toBe('playing');
  });

  it('acelera con la altura, con un piso', () => {
    const bajo = engine.tickMs(board());
    const alto = engine.tickMs(
      board({ tower: Array.from({ length: 20 }, () => ({ start: 0, width: 8 })) })
    );

    expect(alto).toBeLessThan(bajo);
    expect(
      engine.tickMs(board({ tower: Array.from({ length: 500 }, () => ({ start: 0, width: 8 })) }))
    ).toBeGreaterThanOrEqual(34);
  });

  /*
   * Deliberadamente sin semilla: dos partidas del mismo nivel arrancan
   * idénticas. Es el único juego de la casa donde toda la variación la pone el
   * pulso del jugador y nada más.
   */
  it('arranca igual siempre, sin azar de por medio', () => {
    for (const level of LEVELS) {
      const config = engine.getDifficultyConfig(level);
      expect(engine.createInitialState(config, 'una')).toEqual(
        engine.createInitialState(config, 'otra')
      );
    }
  });

  it('la base arranca centrada y el bloque desde un costado', () => {
    for (const level of LEVELS) {
      const config = engine.getDifficultyConfig(level);
      const state = engine.createInitialState(config, undefined);

      expect(state.tower).toHaveLength(1);
      expect(state.moving.start).toBe(0);
      expect(state.tower[0]?.start).toBe(Math.floor((config.slots - config.startWidth) / 2));
    }
  });
});
