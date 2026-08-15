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
}

/**
 * One variable drives the board and everything else derives from it, so the
 * cells stay square and the board never overflows a 360px screen or a short
 * viewport. Reference: docs/DESIGN_SYSTEM.md §7.4.
 *
 * Not square by construction: `rows` may differ from `cols` — Minesweeper needs
 * that, and it is exactly the kind of assumption Phase 6 exists to break.
 */
export function Grid({ cols, rows = cols, children, label, maxSize, gap }: GridProps) {
  return (
    <div
      className={`${s.grid} no-select`}
      role="grid"
      aria-label={label}
      aria-colcount={cols}
      aria-rowcount={rows}
      style={
        {
          '--cols': cols,
          '--rows': rows,
          ...(maxSize === undefined ? {} : { '--board-max': maxSize }),
          ...(gap === undefined ? {} : { '--board-gap': gap }),
        } as CSSVars
      }
    >
      {children}
    </div>
  );
}
