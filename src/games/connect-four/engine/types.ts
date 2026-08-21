/** Quién puso la ficha. `null` es casilla vacía. */
export type Disc = 'red' | 'yellow';

export type Board = (Disc | null)[];

export const COLS = 7;
export const ROWS = 6;

export interface ConnectFourConfig {
  /**
   * Con qué probabilidad la máquina juega la mejor columna que encontró.
   *
   * Es la única palanca, como en el tres en línea — pero con una diferencia que
   * importa: **acá el nivel más alto vale 1 y nunca se equivoca**. Allá tenía
   * que equivocarse por fuerza, porque el juego está resuelto y una máquina
   * perfecta sería imposible de ganar. Conecta 4 tiene un árbol de billones de
   * posiciones y ninguna búsqueda que entre en un navegador lo agota, así que
   * al nivel 5 se le gana **viendo más lejos que él**, no esperando un desliz.
   */
  sharpness: number;
  /** Si el rival lo maneja la máquina o la persona de al lado. */
  vsMachine: boolean;
}

export interface ConnectFourState {
  board: Board;
  /** A quién le toca. El jugador siempre es 'red' y arranca. */
  turn: Disc;
  /** Las cuatro casillas de la línea ganadora, para que la vista las marque. */
  line: number[] | null;
  /** La última casilla ocupada, para animar SOLO la ficha que acaba de caer. */
  last: number | null;
  config: ConnectFourConfig;
  seed: string;
  /** Cuántas jugadas hizo la máquina. Con la semilla, desempata entre iguales. */
  plies: number;
}

export interface ConnectFourMove {
  column: number;
}
