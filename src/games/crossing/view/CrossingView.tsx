import { useEffect, useRef } from 'react';

import { type ArcadeViewProps } from '@core/arcade';
import { type CSSVars } from '@design/types';

import { carTrain, laneAt } from '../engine/lanes';
import { type CrossingMove, type CrossingState, type Step } from '../engine/types';

import s from './CrossingView.module.css';

/** Cuánto hay que arrastrar para que cuente como paso. */
const STEP_PX = 20;

/**
 * En qué fila de la pantalla va el jugador, contando desde arriba.
 *
 * Casi abajo de todo: lo que importa es ver el tráfico que VIENE para poder
 * planear el cruce. Atrás alcanza con una fila — de donde se viene ya se sabe,
 * y cada fila gastada ahí es una menos de anticipación.
 */
const PLAYER_ROW = 7;

const KEYS: Record<string, Step> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function CrossingView({
  state,
  dispatch,
  interactive,
  stepMs,
}: ArcadeViewProps<CrossingState, CrossingMove>) {
  const from = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!interactive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const step = KEYS[event.key];
      if (step === undefined || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      dispatch({ step });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [interactive, dispatch]);

  /*
   * Un deslizamiento es UN paso, y se resuelve al levantar el dedo.
   *
   * Al revés que en Snake, que gira en `pointermove` porque ahí el dedo dirige
   * un movimiento continuo. Acá cada gesto es una decisión discreta —cruzo o no
   * cruzo— y resolverla a mitad del arrastre daría pasos que nadie pidió.
   */
  const onPointerUp = (event: React.PointerEvent) => {
    const start = from.current;
    from.current = null;
    if (!interactive || start === null) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const travelled = horizontal ? dx : dy;

    // Un toque sin arrastre es "adelante": es el gesto que más se repite y no
    // debería costar un movimiento entero.
    if (Math.abs(travelled) < STEP_PX) {
      dispatch({ step: 'up' });
      return;
    }

    if (horizontal) dispatch({ step: dx > 0 ? 'right' : 'left' });
    else dispatch({ step: dy > 0 ? 'down' : 'up' });
  };

  const { cols, rows, distance, col, ticks, seed, target, traffic } = state;

  // De arriba hacia abajo: la fila 0 de la pantalla es la más lejana.
  /*
   * Una fila de más arriba y abajo de lo que se ve.
   *
   * Al avanzar, todas las filas bajan un lugar y la de más arriba entra en
   * escena. Si recién se montara en ese momento, aparecería ya puesta en su
   * lugar mientras las demás se deslizan — y el conjunto se ve a los tropezones.
   * Montada un paso antes, fuera del recorte, entra deslizándose como el resto.
   */
  const screen = Array.from({ length: rows + 2 }, (_, i) => ({
    row: i - 1,
    world: distance + PLAYER_ROW - (i - 1),
  }));

  return (
    <div className={s.crossing}>
      <p className={s.hud}>
        <span className={s.label}>Avance</span>
        <span className="tabular">{distance}</span>
        <span className={s.label}>Meta</span>
        <span className="tabular">{target}</span>
      </p>

      <div
        className={s.frame}
        style={{ '--cols': cols, '--rows': rows, '--step': `${String(stepMs)}ms` } as CSSVars}
      >
        <div
          className={s.field}
          data-dead={state.dead}
          role="img"
          aria-label={`Cruzando: ${String(distance)} de ${String(target)} filas`}
          onPointerDown={(event) => {
            from.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            from.current = null;
          }}
        >
          {/*
            La clave es la fila DEL MUNDO y la posición es la de la pantalla.
            Al avanzar, cada fila baja un lugar y la transición hace de cámara:
            un solo transform por fila en vez de redibujar el tablero.
          */}
          {screen.map(({ row, world }) => {
            // Detrás de la salida no hay mundo: se dibuja vacío en vez de
            // dejar un hueco donde se ve el fondo del tablero.
            const lane = laneAt(seed, world, traffic);
            return (
              <div
                key={world}
                className={s.lane}
                data-kind={world < 0 ? 'void' : lane.kind}
                style={{ '--row': row } as CSSVars}
                aria-hidden="true"
              >
                {world >= 0 &&
                  carTrain(lane, cols, ticks).map((car) => (
                    <span
                      key={car.id}
                      className={s.car}
                      data-dir={lane.dir === 1 ? 'right' : 'left'}
                      style={{ '--col': car.col } as CSSVars}
                    />
                  ))}
              </div>
            );
          })}

          <span
            className={s.player}
            data-dead={state.dead}
            style={{ '--col': col, '--row': PLAYER_ROW } as CSSVars}
            aria-hidden="true"
          />
        </div>
      </div>

      <p className={s.help}>
        {state.dead
          ? 'Te pasó por encima.'
          : 'Tocá para avanzar, o deslizá para elegir hacia dónde.'}
      </p>
    </div>
  );
}
