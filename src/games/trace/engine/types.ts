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
   * Si el tablero tiene que tener UNA sola solución.
   *
   * Con unicidad cada movimiento es una deducción —"esto va acá porque si no
   * aquella esquina queda inalcanzable"— y eso es el rompecabezas. Pero
   * demostrarla es lo caro: el buscador recorre caminos con techo de 400 000
   * pasos, y más allá de 6×6 se rinde casi siempre, así que el tablero no puede
   * crecer.
   *
   * En experto se cambia una cosa por la otra. Sin exigir unicidad el 8×8 se
   * genera en milisegundos, y la dificultad pasa a ser de otro tipo: no deducir
   * cuál es el camino, sino conseguir uno que cubra sesenta y cuatro casillas
   * sin dejar ninguna aislada. Nada se rompe — el motor valida reglas, no
   * compara contra la solución guardada.
   *
   * Ojo con la inversión que trae: con unicidad, menos números es MÁS difícil
   * (menos anclas, más que deducir). Sin unicidad es al revés, menos números es
   * más fácil, porque hay más caminos válidos. Por eso experto lleva muchos.
   */
  unique: boolean;
  /**
   * Piso de números: hasta dónde adelgazar antes de parar.
   *
   * El tablero ya está garantizado único, así que dejar de sacar solo hace el
   * camino más evidente. Es la misma palanca que en Tango, y por el mismo
   * motivo: subir el tamaño encarece la generación mucho más rápido de lo que
   * sube la dificultad.
   *
   * Con `unique: false` significa lo contrario: no un piso al adelgazar sino
   * CUÁNTOS números plantar, repartidos parejo por el recorrido.
   */
  keep: number;
}
