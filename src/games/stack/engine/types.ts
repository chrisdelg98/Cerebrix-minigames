/** Una pieza apoyada, medida en ranuras. */
export interface Piece {
  start: number;
  width: number;
}

export interface StackMove {
  kind: 'drop';
}

export interface StackState {
  /**
   * En cuántas ranuras se divide el ancho del tablero.
   *
   * Es la resolución del juego: cuanto más fina, más chico es el recorte de un
   * error mínimo. Con pocas ranuras cada desliz cuesta un pedazo enorme y la
   * torre se acaba en cuatro movimientos.
   */
  slots: number;
  /** Las piezas apoyadas, de abajo hacia arriba. */
  tower: Piece[];
  /** La que se desliza, todavía sin apoyar. */
  moving: Piece & { dir: 1 | -1 };
  /** Cuántos pisos hay que levantar para ganar. */
  target: number;
  /** El ancho con el que empezó. Un apoyo perfecto recupera hasta acá. */
  fullWidth: number;
  /** Apoyos perfectos seguidos. Solo para el marcador. */
  streak: number;
  baseMs: number;
  dead: boolean;
}

export interface StackConfig {
  slots: number;
  target: number;
  startWidth: number;
  baseMs: number;
}
