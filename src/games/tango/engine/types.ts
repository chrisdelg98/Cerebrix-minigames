export const EMPTY = 0;
export const SUN = 1;
export const MOON = 2;

export type Value = typeof EMPTY | typeof SUN | typeof MOON;

/** Fixed at six by the rules: three of each per line only works on an even size. */
export const SIZE = 6;

/**
 * A sign drawn between two touching cells. `i` is always the smaller index, and
 * `j` is either `i + 1` (a horizontal pair) or `i + SIZE` (a vertical one).
 */
export interface Constraint {
  i: number;
  j: number;
  /** `=` when true, `×` when false. */
  same: boolean;
}

export interface TangoState {
  /** Row-major, SIZE × SIZE. */
  values: Value[];
  /** True where the puzzle supplied the symbol. These cannot be changed. */
  given: boolean[];
  constraints: Constraint[];
  /** The one solution. Puzzles are generated with uniqueness verified. */
  solution: Value[];
}

export interface TangoMove {
  index: number;
  value: Value;
}

export interface TangoConfig {
  /** Cuántos signos colgar antes de adelgazarlos. */
  signs: number;
  /**
   * Si el nivel admite razonar por contradicción.
   *
   * Es la única palanca real de dificultad. La cantidad de casillas dadas no se
   * fija: sale sola de sacar todo lo que el tablero pueda perder sin dejar de
   * resolverse con las reglas que este nivel permite. Regalar símbolos al azar
   * llenaba el tablero sin hacer ningún paso más evidente.
   */
  allowContradiction: boolean;
  /**
   * Piso de casillas dadas: hasta dónde adelgazar antes de parar.
   *
   * No es rellenar al azar — es dejar de sacar. El tablero ya está garantizado
   * deducible, así que cada casilla que sobra sostiene un paso que se ve; parar
   * antes solo hace que haya más de esos pasos disponibles a la vez, que es lo
   * que de verdad se siente como "fácil".
   */
  keep: number;
}
