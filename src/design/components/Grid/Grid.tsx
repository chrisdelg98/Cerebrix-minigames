import { type ReactNode } from 'react';

import { type CSSVars } from '../../types';

import s from './Grid.module.css';

export interface GridProps {
  cols: number;
  rows?: number;
  children: ReactNode;
  /** Accessible name of the board, e.g. "Tablero de Sudoku". */
  label: string;
  /** Caps the board width. Defaults to the shared board budget. */
  maxSize?: string;
  gap?: string;
  /** Wraps the board in a raised surface so it reads as an object on the page. */
  framed?: boolean;
}

/**
 * One variable drives the board and everything else derives from it, so the
 * cells stay square and the board never overflows a 360px screen or a short
 * viewport. Reference: docs/DESIGN_SYSTEM.md §7.4.
 *
 * Not square by construction: `rows` may differ from `cols` — Minesweeper needs
 * that, and it is exactly the kind of assumption Phase 6 exists to break.
 */
export function Grid({ cols, rows = cols, children, label, maxSize, gap, framed }: GridProps) {
  /*
   * The knobs go on the OUTERMOST element and everything inside inherits them.
   * The frame is what the height cap is applied to, and a frame that cannot see
   * --cols and --rows computes an invalid calc() — which silently drops the cap
   * instead of failing loudly.
   */
  const knobs = {
    '--cols': cols,
    '--rows': rows,
    ...(maxSize === undefined ? {} : { '--board-max': maxSize }),
    ...(gap === undefined ? {} : { '--board-gap': gap }),
  } as CSSVars;

  const grid = (
    <div
      className={`${s.grid} no-select`}
      role="grid"
      aria-label={label}
      aria-colcount={cols}
      aria-rowcount={rows}
      style={framed === true ? undefined : knobs}
    >
      {children}
    </div>
  );

  // A wrapper rather than padding on the grid itself: padding would eat into
  // the box that aspect-ratio sizes, and squeeze every cell.
  return framed === true ? (
    <div className={s.frame} style={knobs}>
      {grid}
    </div>
  ) : (
    grid
  );
}
