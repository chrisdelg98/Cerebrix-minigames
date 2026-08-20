export interface TraceState {
  size: number;
  /** Número de cada casilla, o 0. Los números se recorren en orden creciente. */
  numbers: number[];
  /** El trazo del jugador: índices de casilla, en el orden en que los recorrió. */
  path: number[];
  /** Un recorrido válido, para la pista de último recurso. */
  solution: number[];
}

/** El trazo entero, no un paso: un gesto es un movimiento y un deshacer. */
export interface TraceMove {
  path: number[];
}

export interface TraceConfig {
  size: number;
  /**
   * Piso de números: hasta dónde adelgazar antes de parar.
   *
   * El tablero ya está garantizado único, así que dejar de sacar solo hace el
   * camino más evidente. Es la misma palanca que en Tango, y por el mismo
   * motivo: subir el tamaño encarece la generación mucho más rápido de lo que
   * sube la dificultad.
   */
  keep: number;
}
