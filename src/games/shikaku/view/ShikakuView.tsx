import { useEffect, useRef, useState } from 'react';

import { type GameViewProps } from '@core/contract';
import { type CSSVars } from '@design/types';

import { rectBetween } from '../engine/shikakuEngine';
import { area, covers, numbersIn } from '../engine/solve';
import { type Rect, type ShikakuMove, type ShikakuState } from '../engine/types';
import { tonesByNumber } from './colors';

import s from './ShikakuView.module.css';

/** El rectángulo, en porcentajes del tablero. Sirve igual a cualquier tamaño. */
function box(rect: Rect, size: number): React.CSSProperties {
  return {
    '--x': `${String((rect.x / size) * 100)}%`,
    '--y': `${String((rect.y / size) * 100)}%`,
    '--w': `${String((rect.w / size) * 100)}%`,
    '--h': `${String((rect.h / size) * 100)}%`,
  } as CSSVars;
}

export function ShikakuView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<ShikakuState, ShikakuMove>) {
  const { size, numbers, rects } = state;

  /* El arrastre en curso: dónde empezó y por dónde va. Vive acá y no en el
     estado del juego — una intención a medias no es una jugada. */
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  /* El listener de `window` se registra una vez y necesita ver el arrastre al
     día sin volver a suscribirse en cada movimiento del dedo. */
  const dragRef = useRef(drag);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const tones = tonesByNumber(numbers);
  const hinted = new Set((hint?.cells ?? []).map((one) => one.row * size + one.col));

  /*
   * El arrastre termina en `window`, no en el tablero.
   *
   * Si el dedo se levanta fuera del tablero —y en el borde pasa seguido— el
   * `pointerup` no llega al tablero y el rectángulo fantasma se queda pegado a
   * la pantalla hasta el toque siguiente.
   */
  useEffect(() => {
    const finish = () => {
      const current = dragRef.current;
      setDrag(null);
      if (current === null) return;

      if (current.from === current.to && rects.some((rect) => covers(rect, current.from, size))) {
        dispatch({ kind: 'erase', cell: current.from });
        return;
      }
      dispatch({ kind: 'draw', from: current.from, to: current.to });
    };

    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [dispatch, rects, size]);

  /* Qué dice el rectángulo que se está dibujando: si ya cierra, cuánto le falta,
     o si se pasó. Es la mitad de la sensación — se sabe antes de soltar. */
  const preview = drag === null ? null : rectBetween(drag.from, drag.to, size);
  const inside = preview === null ? [] : numbersIn(preview, size, numbers);
  const want = inside.length === 1 ? (inside[0] ?? 0) : 0;
  const state_ =
    preview === null
      ? 'none'
      : inside.length !== 1
        ? 'bad'
        : area(preview) === want
          ? 'ok'
          : 'partial';

  return (
    <div className={s.shikaku}>
      <p className={s.hud} aria-live="polite">
        <span className={s.label}>Cubierto</span>
        <span className="tabular">
          {rects.reduce((total, rect) => total + area(rect), 0)}/{size * size}
        </span>
      </p>

      <div className={s.board} style={{ '--size': size } as CSSVars}>
        {/* Los rectángulos van debajo y no reciben toques: la capa de arriba es
            la que escucha, así el dibujo nunca se come un gesto. */}
        <div className={s.pieces} aria-hidden="true">
          {rects.map((rect) => (
            <span
              key={`${String(rect.x)}-${String(rect.y)}-${String(rect.w)}-${String(rect.h)}`}
              className={`${s.rect} anim-pop-in`}
              style={{ ...box(rect, size), '--tone': tones.get(area(rect)) ?? '' } as CSSVars}
            />
          ))}

          {preview !== null && (
            <span className={s.preview} data-state={state_} style={box(preview, size)}>
              <span className={s.count}>
                {area(preview)}
                {want > 0 && `/${String(want)}`}
              </span>
            </span>
          )}
        </div>

        <div className={s.grid} role="grid" aria-label="Tablero de Shikaku">
          {numbers.map((number, cell) => (
            <button
              key={cell}
              type="button"
              role="gridcell"
              className={s.cell}
              data-number={number > 0}
              data-hinted={hinted.has(cell)}
              disabled={!interactive}
              aria-label={
                number > 0
                  ? `fila ${String(Math.floor(cell / size) + 1)}, columna ${String((cell % size) + 1)}, número ${String(number)}`
                  : `fila ${String(Math.floor(cell / size) + 1)}, columna ${String((cell % size) + 1)}`
              }
              onPointerDown={(event) => {
                if (!interactive) return;
                /*
                 * Soltar la captura implícita, o en un teléfono no se arrastra.
                 *
                 * Al tocar, el navegador le da al elemento del `pointerdown`
                 * la captura del puntero: todo lo que viene después va a ESA
                 * casilla, así que `pointerenter` no se dispara en ninguna otra
                 * y el rectángulo se queda en la primera. Con ratón no pasa, y
                 * por eso no se veía.
                 *
                 * Se suelta desde `event.target`, que es quien la tiene de
                 * verdad — el botón nunca la tuvo. Es el mismo arreglo que
                 * `<Cell>` hace para Trazo y Nonograma; este tablero dibuja sus
                 * casillas a mano y por eso no lo heredó.
                 */
                const holder = event.target;
                if (holder instanceof Element && typeof holder.hasPointerCapture === 'function') {
                  if (holder.hasPointerCapture(event.pointerId)) {
                    holder.releasePointerCapture(event.pointerId);
                  }
                }
                setDrag({ from: cell, to: cell });
              }}
              onPointerEnter={() => {
                setDrag((current) => (current === null ? null : { ...current, to: cell }));
              }}
            >
              {number > 0 && <span className={s.number}>{number}</span>}
            </button>
          ))}
        </div>
      </div>

      <p className={s.help}>Arrastrá de esquina a esquina. Tocá un rectángulo para sacarlo.</p>
    </div>
  );
}
