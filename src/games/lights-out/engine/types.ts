export interface LightsOutState {
  size: number;
  /** Una por casilla: true es encendida. */
  lights: boolean[];
  /** Cuántas veces tocó el jugador. Solo para el marcador. */
  moves: number;
}

export interface LightsOutMove {
  index: number;
}

export interface LightsOutConfig {
  size: number;
  /**
   * Cuántos toques al azar se le dan al tablero apagado para armarlo.
   *
   * Es la única medida de "qué tan revuelto está": el tablero se genera al
   * revés, así que estos toques SON una solución. Ver `createInitialState`.
   */
  clicks: number;
}
