/** A cell holds 0 when empty; 1–9 otherwise. Always exactly 81 entries. */
export interface SudokuState {
  values: number[];
  /** True where the puzzle supplied the digit. These can never be edited. */
  given: boolean[];
  /** Pencil marks as a bitmask: bit (n - 1) set means note n is on. */
  notes: number[];
  /** The one solution. Puzzles are generated with uniqueness verified. */
  solution: number[];
}

export type SudokuMove =
  | { kind: 'set'; index: number; value: number }
  | { kind: 'note'; index: number; value: number }
  | { kind: 'erase'; index: number };

export interface SudokuConfig {
  difficulty: number;
}
