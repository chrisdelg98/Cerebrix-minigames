export const EMPTY = 0;
/** An X: the player ruling a square out. Costs nothing and carries no rule. */
export const MARK = 1;
export const QUEEN = 2;

export type Cell = typeof EMPTY | typeof MARK | typeof QUEEN;

export interface QueensState {
  size: number;
  /** Region id per cell, row-major. There are exactly `size` regions. */
  regions: number[];
  marks: Cell[];
  /** The column each row's queen belongs in. Verified unique when generated. */
  solution: number[];
}

export interface QueensMove {
  index: number;
  value: Cell;
}

export interface QueensConfig {
  size: number;
}
