import { memo, type ReactNode, type Ref } from 'react';
import type React from 'react';

import { type CSSVars } from '../../types';

import s from './Cell.module.css';

export type CellState =
  | 'empty'
  | 'filled'
  | 'fixed'
  | 'selected'
  /** Face down: the value exists but the player has not earned it yet. */
  | 'covered'
  /** Shares a row, column or box with the selected cell. */
  | 'peer'
  /** Holds the same digit as the selected cell, anywhere on the board. */
  | 'same'
  | 'error'
  | 'hint';

/** Which sides carry a thick block divider — Sudoku's 3×3 boxes, and anything like them. */
export type BlockEdge = 'top' | 'right' | 'bottom' | 'left';

export interface CellProps {
  state?: CellState;
  value?: ReactNode;
  /** Required: "fila 3, columna 5, vacía" is what a screen reader reads out. */
  label: string;
  onActivate?: () => void;
  disabled?: boolean;
  blockEdges?: readonly BlockEdge[];
  /**
   * Who put the value there. A board where your own digits look exactly like
   * the ones you were given hides the only thing you actually did.
   *
   * Explicitly `| undefined` because `exactOptionalPropertyTypes` is on: an
   * empty cell has no author, and saying so should not need a spread.
   */
  authored?: 'clue' | 'player' | undefined;
  /** Distance from the origin of a reveal, for wave cascades. */
  distance?: number | undefined;
  animate?: 'pop-in' | 'reveal-wave' | 'none';
  /**
   * React 19 passes ref as an ordinary prop — no forwardRef needed. A board
   * that owns keyboard navigation needs this to move focus with the selection.
   */
  ref?: Ref<HTMLButtonElement>;
  /**
   * Secondary interaction — the flag in Minesweeper, and whatever the next
   * game calls it. A board with only one gesture was a Sudoku assumption.
   */
  onContextMenu?: (event: React.MouseEvent) => void;
  onPointerDown?: (event: React.PointerEvent) => void;
  /**
   * Painting by dragging: the finger presses one cell and keeps going.
   *
   * Needs the board to release the implicit pointer capture on `pointerdown`,
   * or a touch never leaves the cell it started on and this never fires.
   */
  onPointerEnter?: (event: React.PointerEvent) => void;
  onPointerUp?: (event: React.PointerEvent) => void;
  onPointerLeave?: (event: React.PointerEvent) => void;
}

/**
 * ONE cell for every game. Sudoku and Minesweeper use this exact component;
 * what differs is the state and the knobs the board sets around it
 * (docs/DESIGN_SYSTEM.md §9).
 *
 * memo is not an optimisation here, it is a requirement: an expert Minesweeper
 * board is ~480 of these, and without it every dispatch re-renders all of them.
 *
 * It renders a real <button> so it is keyboard-reachable and pressable, with
 * role=gridcell so the board reads as a grid rather than 480 loose buttons.
 */
export const Cell = memo(function Cell({
  state = 'empty',
  value,
  label,
  onActivate,
  disabled = false,
  blockEdges,
  authored,
  distance,
  animate = 'none',
  ref,
  onContextMenu,
  onPointerDown,
  onPointerEnter,
  onPointerUp,
  onPointerLeave,
}: CellProps) {
  const animationClass =
    animate === 'pop-in' ? 'anim-pop-in' : animate === 'reveal-wave' ? 'anim-reveal-wave' : '';

  return (
    <button
      ref={ref}
      type="button"
      role="gridcell"
      className={`${s.cell} ${animationClass}`}
      data-state={state}
      data-authored={authored}
      data-edge-top={blockEdges?.includes('top')}
      data-edge-right={blockEdges?.includes('right')}
      data-edge-bottom={blockEdges?.includes('bottom')}
      data-edge-left={blockEdges?.includes('left')}
      style={distance === undefined ? undefined : ({ '--dist': distance } as CSSVars)}
      aria-label={label}
      disabled={disabled}
      onClick={onActivate}
      onContextMenu={onContextMenu}
      onPointerDown={(event) => {
        /*
         * Un toque captura el puntero en el elemento donde empezó, así que sin
         * soltarlo el arrastre sigue reportando esa misma casilla y `onPointerEnter`
         * no llega nunca a las de al lado: pintar una hilera o trazar un camino
         * en un teléfono se vuelve imposible.
         *
         * Lo hacía cada tablero por su cuenta, y los dos que lo hacían lo
         * soltaban desde `currentTarget` — el botón —, que es justamente el que
         * NO la tiene cuando el dedo cae sobre el dibujo de la casilla. Vive
         * acá, que es donde está el botón, y se suelta desde el elemento que la
         * tiene de verdad.
         *
         * Solo para tableros que se dibujan arrastrando: si nadie escucha
         * `onPointerEnter`, la captura no molesta a nadie y soltarla sería
         * cambiarle el comportamiento a un tablero que no lo pidió.
         */
        if (onPointerEnter) {
          const holder = event.target;
          // La captura del puntero no está en todos lados, y una excepción acá
          // adentro se lleva puesto el tablero entero: soltarla es un arreglo,
          // no la jugada.
          if (holder instanceof Element && typeof holder.hasPointerCapture === 'function') {
            if (holder.hasPointerCapture(event.pointerId)) {
              holder.releasePointerCapture(event.pointerId);
            }
          }
        }
        onPointerDown?.(event);
      }}
      onPointerEnter={onPointerEnter}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {value}
    </button>
  );
});
