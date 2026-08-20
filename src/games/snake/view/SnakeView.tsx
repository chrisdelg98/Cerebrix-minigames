import { useEffect, useRef } from 'react';

import { type ArcadeViewProps } from '@core/arcade';
import { type CSSVars } from '@design/types';

import { type Heading, type SnakeMove, type SnakeState } from '../engine/types';

import s from './SnakeView.module.css';

/**
 * Cuánto hay que arrastrar para que cuente como giro.
 *
 * Bajo a propósito. Snake se juega con el pulgar sobre el mismo tablero, y un
 * umbral cómodo para "deslizar una página" es demasiado tarde para "girar antes
 * de la pared". Dieciocho píxeles es un movimiento chico y decidido.
 */
const TURN_PX = 18;

const KEYS: Record<string, Heading> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function SnakeView({
  state,
  dispatch,
  interactive,
  stepMs,
}: ArcadeViewProps<SnakeState, SnakeMove>) {
  const from = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!interactive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const heading = KEYS[event.key];
      if (heading === undefined || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      dispatch({ heading });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [interactive, dispatch]);

  /*
   * El giro sale en `pointermove`, no al levantar el dedo.
   *
   * Esperar al `pointerup` agrega el tiempo que el dedo tarde en despegarse, y
   * en un juego donde el paso dura 120 ms eso es la diferencia entre girar y
   * chocar. Además el origen se reinicia con cada giro, así que un mismo
   * arrastre puede encadenar varios — se dibuja el camino con el pulgar sin
   * levantarlo.
   */
  const onPointerMove = (event: React.PointerEvent) => {
    const start = from.current;
    if (!interactive || start === null) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (Math.abs(horizontal ? dx : dy) < TURN_PX) return;

    dispatch({ heading: horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up' });
    from.current = { x: event.clientX, y: event.clientY };
  };

  const { cols, rows, body, food } = state;
  const eaten = body.length - 3;

  return (
    <div className={s.snake}>
      <p className={s.hud}>
        <span className={s.label}>Largo</span>
        <span className="tabular">{body.length}</span>
        <span className={s.label}>Meta</span>
        <span className="tabular">{state.target}</span>
      </p>

      <div
        className={s.frame}
        style={
          {
            '--cols': cols,
            '--rows': rows,
            // El deslizamiento dura EXACTAMENTE lo que dura el paso: así el
            // movimiento es continuo en vez de un salto con pausa.
            '--step': `${String(stepMs)}ms`,
          } as CSSVars
        }
      >
        <div
          className={s.field}
          data-dead={state.dead}
          role="img"
          aria-label={`Snake, ${String(body.length)} de largo, meta ${String(state.target)}`}
          onPointerDown={(event) => {
            from.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerMove={onPointerMove}
          onPointerUp={() => {
            from.current = null;
          }}
          onPointerCancel={() => {
            from.current = null;
          }}
        >
          {food >= 0 && (
            <span className={`${s.food} anim-breathe`} style={at(food, cols)} aria-hidden="true" />
          )}

          {/*
            La clave es el ÍNDICE y no la casilla, y de ahí sale el deslizamiento.
            Cada paso, el segmento i pasa a ocupar donde estaba el i-1 — su
            vecino —, así que cada elemento se mueve exactamente una casilla y la
            transición lo hace continuo. Con la casilla como clave, React
            destruiría y crearía elementos y la víbora parpadearía.
          */}
          {body.map((cell, i) => (
            <span
              key={i}
              className={s.segment}
              data-head={i === 0}
              style={at(cell, cols)}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      <p className={s.help} aria-live="polite">
        {state.dead
          ? 'Chocaste.'
          : eaten === 0
            ? 'Deslizá el dedo sobre el tablero para girar.'
            : `${String(eaten)} ${eaten === 1 ? 'fruta' : 'frutas'}`}
      </p>
    </div>
  );
}

/** La posición de una casilla, en coordenadas de grilla para el transform. */
function at(index: number, cols: number): React.CSSProperties {
  return { '--x': index % cols, '--y': Math.floor(index / cols) } as CSSVars;
}
