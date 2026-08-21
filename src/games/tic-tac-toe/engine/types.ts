/** Quién puso la ficha. `null` es casilla vacía. */
export type Mark = 'x' | 'o';

export type Board = (Mark | null)[];

export interface TicTacToeConfig {
  /**
   * Con qué probabilidad la máquina juega la mejor jugada. Es la ÚNICA perilla
   * de la dificultad: siempre calcula, y esto decide cuánto se deja llevar.
   *
   * Nunca llega a 1 a propósito: el tres en línea está RESUELTO —con juego
   * perfecto de los dos lados el resultado es siempre empate—, así que una
   * máquina impecable no sería un nivel difícil sino una pared, imposible de
   * ganar por definición. Ese nivel nunca daría un trofeo ni alimentaría una
   * racha. En el nivel más alto la máquina se equivoca poco, pero se equivoca.
   */
  sharpness: number;
  /** Si el rival lo maneja la máquina o la persona de al lado. */
  vsMachine: boolean;
}

export interface TicTacToeState {
  board: Board;
  /** A quién le toca. El jugador siempre es 'x' y arranca. */
  turn: Mark;
  /** Las tres casillas de la línea ganadora, para que la vista las marque. */
  line: number[] | null;
  config: TicTacToeConfig;
  /** Semilla del azar de la máquina, para que una partida sea reproducible. */
  seed: string;
  /** Cuántas jugadas hizo la máquina. Con la semilla, decide sus titubeos. */
  plies: number;
}

export interface TicTacToeMove {
  cell: number;
}
