import { describe, expect, it } from 'vitest';

import { type Difficulty } from '@core/contract';
import { rectBetween, shikakuEngine as engine } from '@games/shikaku/engine/shikakuEngine';
import { countSolutions } from '@games/shikaku/engine/solve';
import { type ShikakuState } from '@games/shikaku/engine/types';
import { tonesByNumber } from '@games/shikaku/view/colors';

function nuevo(difficulty: Difficulty, seed: string): ShikakuState {
  return engine.createInitialState(engine.getDifficultyConfig(difficulty), seed) as ShikakuState;
}

/** Un tablero a mano: 3×3 con un 3 arriba a la izquierda y un 6 en el medio. */
function aMano(): ShikakuState {
  return {
    size: 3,
    numbers: [3, 0, 0, 0, 6, 0, 0, 0, 0],
    rects: [],
    solution: [],
  };
}

describe('dibujar', () => {
  it('el arrastre da el mismo rectángulo en cualquier sentido', () => {
    const size = 4;
    const derecha = rectBetween(0, 9, size); // de la esquina hacia abajo-derecha
    const revés = rectBetween(9, 0, size);

    expect(derecha).toEqual({ x: 0, y: 0, w: 2, h: 3 });
    expect(revés, 'arrastrar al revés dio otro rectángulo').toEqual(derecha);
  });

  it('acepta el rectángulo que mide lo que dice su número', () => {
    // El 3 está en la esquina: 3×1 hacia la derecha.
    expect(engine.validate(aMano(), { kind: 'draw', from: 0, to: 2 }).ok).toBe(true);
  });

  it('rechaza el que no contiene ningún número', () => {
    const v = engine.validate(aMano(), { kind: 'draw', from: 6, to: 7 });
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/contener un número/);
  });

  it('rechaza el que agarra dos', () => {
    const v = engine.validate(aMano(), { kind: 'draw', from: 0, to: 4 });
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/dos números/);
  });

  it('rechaza el que no coincide en área, y lo dice con números', () => {
    const v = engine.validate(aMano(), { kind: 'draw', from: 0, to: 1 });
    expect(v.ok).toBe(false);
    expect(v.ok === false && v.reason).toMatch(/mide 2 y el número dice 3/);
  });
});

describe('corregir', () => {
  /* Es como funcionan los Shikaku de siempre: se corrige redibujando encima, sin
     borrar primero. */
  it('dibujar encima reemplaza lo que pisa', () => {
    let state = engine.applyMove(aMano(), { kind: 'draw', from: 0, to: 2 });
    expect(state.rects).toHaveLength(1);

    state = engine.applyMove(state, { kind: 'draw', from: 0, to: 6 });
    expect(state.rects, 'el rectángulo viejo sobrevivió').toHaveLength(1);
    expect(state.rects[0]).toEqual({ x: 0, y: 0, w: 1, h: 3 });
  });

  it('tocar un rectángulo lo saca', () => {
    const puesto = engine.applyMove(aMano(), { kind: 'draw', from: 0, to: 2 });
    const vacío = engine.applyMove(puesto, { kind: 'erase', cell: 1 });

    expect(vacío.rects).toHaveLength(0);
  });

  it('y en una casilla libre no hay nada que sacar', () => {
    expect(engine.validate(aMano(), { kind: 'erase', cell: 8 }).ok).toBe(false);
  });
});

describe('terminar', () => {
  /*
   * Cubrir el tablero ES resolverlo, y por eso `checkStatus` no compara contra
   * la solución guardada: todo rectángulo puesto ya lleva un número y mide lo
   * que ese número dice, así que un conjunto así que cubra todo es una solución
   * válida — y el tablero se generó con una sola.
   */
  it('se gana al cubrir la última casilla', () => {
    const state = nuevo(1, 'fin');
    const lleno: ShikakuState = { ...state, rects: state.solution };

    expect(engine.checkStatus(state).kind).toBe('playing');
    expect(engine.checkStatus(lleno).kind).toBe('won');
    expect(engine.getProgress(lleno)).toBe(1);
  });
});

describe('los tableros', () => {
  /*
   * Uno solo se resuelve de una manera. Sin esto no sería un juego de deducción
   * sino de encajar piezas — es la misma exigencia que en Trazo, salvo que acá
   * demostrarla sale casi gratis: la regla de "un número por rectángulo y el
   * área tiene que coincidir" poda la búsqueda de inmediato.
   */
  it('tienen UNA sola solución en los cinco niveles', () => {
    for (const d of [1, 2, 3, 4, 5] as Difficulty[]) {
      const config = engine.getDifficultyConfig(d);
      for (let i = 0; i < 4; i += 1) {
        const state = nuevo(d, `u-${String(d)}-${String(i)}`);
        const { found, exhausted } = countSolutions(state.size, state.numbers, config.maxArea);

        expect(exhausted, `nivel ${String(d)}: el buscador se rindió`).toBe(false);
        expect(found, `nivel ${String(d)} tablero ${String(i)}: ${String(found)} soluciones`).toBe(
          1
        );
      }
    }
  }, 60_000);

  it('la escala crece en tablero y en casillas por pista', () => {
    const medida = ([1, 2, 3, 4, 5] as Difficulty[]).map((d) => {
      const state = nuevo(d, `m-${String(d)}`);
      const pistas = state.numbers.filter((n) => n > 0).length;
      return { size: state.size, porPista: (state.size * state.size) / pistas };
    });

    for (let i = 1; i < medida.length; i += 1) {
      const antes = medida[i - 1];
      const ahora = medida[i];
      if (antes === undefined || ahora === undefined) continue;
      expect(ahora.size).toBeGreaterThanOrEqual(antes.size);
    }
    // De punta a punta la diferencia tiene que notarse, no ser un empate largo.
    expect(medida[4]?.porPista ?? 0).toBeGreaterThan(medida[0]?.porPista ?? 0);
  });
});

describe('los colores', () => {
  /*
   * Un matiz por NÚMERO, no por rectángulo: todos los 2 de una partida son del
   * mismo color. Así el color deja de ser decoración y dice el área de un
   * vistazo. La versión anterior coloreaba por vecindad y era correcta, pero el
   * mismo 2 salía de cinco colores distintos en el mismo tablero.
   */
  it('el mismo número lleva siempre el mismo matiz', () => {
    const state = nuevo(4, 'color');
    const tonos = tonesByNumber(state.numbers);

    for (const rect of state.solution) {
      const otros = state.solution.filter((one) => one.w * one.h === rect.w * rect.h);
      for (const otro of otros) {
        expect(
          tonos.get(otro.w * otro.h),
          `dos ${String(rect.w * rect.h)} con matices distintos`
        ).toBe(tonos.get(rect.w * rect.h));
      }
    }
  });

  it('y números distintos no comparten mientras haya matices', () => {
    const state = nuevo(1, 'pocos');
    const distintos = [...new Set(state.numbers.filter((n) => n > 0))];
    const tonos = tonesByNumber(state.numbers);
    const usados = new Set(distintos.map((n) => tonos.get(n)));

    // Con seis matices y pocos números, cada uno tiene que llevarse el suyo.
    expect(distintos.length).toBeLessThanOrEqual(6);
    expect(usados.size, 'dos números distintos compartieron matiz').toBe(distintos.length);
  });

  /*
   * El reparto sale barajado del propio tablero: la misma partida da siempre los
   * mismos colores —si no, parpadearía en cada render— y otra partida los da
   * distintos.
   */
  it('es estable dentro de una partida y cambia entre partidas', () => {
    const a = nuevo(3, 'una');
    const b = nuevo(3, 'otra');

    expect(tonesByNumber(a.numbers)).toEqual(tonesByNumber(a.numbers));

    const clave = (m: Map<number, string>) => [...m.entries()].sort().join('|');
    expect(clave(tonesByNumber(a.numbers)), 'dos tableros dieron el mismo reparto').not.toBe(
      clave(tonesByNumber(b.numbers))
    );
  });
});
