import { useEffect } from 'react';

import { type ArcadeViewProps } from '@core/arcade';
import { SwipeArea } from '@design/components/SwipeArea';
import { type CSSVars } from '@design/types';

import { type Heading, type SnakeMove, type SnakeState } from '../engine/types';

import s from './SnakeView.module.css';

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

  const { cols, rows, body, food } = state;
  const eaten = body.length - 3;

  /*
   * Se gira desde CUALQUIER parte del área de juego, no solo sobre el tablero.
   *
   * Con el gesto encima del tablero había que taparlo con la mano justo cuando
   * hacía falta verlo, y en experto —17×17— eso es medio juego oculto. El
   * área ocupa todo el alto y ancho disponibles; el tablero solo se mira.
   *
   * Dieciocho píxeles de umbral: bajo a propósito, porque un umbral cómodo para
   * "pasar de página" llega tarde para "girar antes de la pared".
   */
  return (
    <SwipeArea
      enabled={interactive}
      threshold={18}
      label="Deslizá en cualquier parte para girar"
      onSwipe={(heading) => {
        dispatch({ heading });
      }}
    >
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
          >
            {food >= 0 && (
              <span
                className={`${s.food} anim-breathe`}
                style={at(food, cols)}
                aria-hidden="true"
              />
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
    </SwipeArea>
  );
}

/** La posición de una casilla, en coordenadas de grilla para el transform. */
function at(index: number, cols: number): React.CSSProperties {
  return { '--x': index % cols, '--y': Math.floor(index / cols) } as CSSVars;
}
