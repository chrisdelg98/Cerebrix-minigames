/** Un rectángulo colocado, en coordenadas de casilla. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShikakuConfig {
  size: number;
  /**
   * Área máxima de un rectángulo del tablero generado.
   *
   * Es la segunda palanca de la dificultad y es independiente del tamaño:
   * subirla da rectángulos más grandes, menos números y por lo tanto más
   * casillas que decidir por cada pista. Medido, de 2.7 a 4.1 casillas por
   * pista entre el mínimo y el máximo que usamos.
   */
  maxArea: number;
}

export interface ShikakuState {
  size: number;
  /** El número de cada casilla, o 0. Uno por rectángulo de la solución. */
  numbers: number[];
  /** Los rectángulos que el jugador ya dibujó. Todos válidos por construcción. */
  rects: Rect[];
  /** La partición que generó el tablero, para la pista de último recurso. */
  solution: Rect[];
}

export type ShikakuMove =
  /** Dibujar de una casilla a otra. Reemplaza lo que pise. */
  | { kind: 'draw'; from: number; to: number }
  /** Sacar el rectángulo que ocupa esa casilla. */
  | { kind: 'erase'; cell: number };
