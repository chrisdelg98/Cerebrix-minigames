export type Step = 'up' | 'down' | 'left' | 'right';

export interface CrossingMove {
  step: Step;
}

/** Una fila del mundo: vereda donde se descansa, o calle donde pasan autos. */
export interface Lane {
  kind: 'safe' | 'road';
  /** Hacia dónde van los autos: 1 derecha, -1 izquierda. */
  dir: 1 | -1;
  /** Cada cuántos ticks avanzan una casilla. Más bajo es más rápido. */
  every: number;
  /** Casillas entre auto y auto. Más bajo es más tráfico. */
  gap: number;
  /** Corrimiento inicial, para que dos calles iguales no vayan sincronizadas. */
  offset: number;
}

export interface CrossingState {
  cols: number;
  /** Cuántas filas se ven a la vez. */
  rows: number;
  /**
   * Cuántas filas avanzó el jugador. Es el puntaje, y también la cámara.
   *
   * La posición del jugador en el mundo ES este número: no hace falta guardar
   * su fila aparte porque no puede estar en otro lado.
   */
  distance: number;
  col: number;
  /**
   * Cuántos pasos dio el reloj.
   *
   * Los autos NO se guardan. Dónde está cada uno se calcula a partir de esto y
   * de la semilla — ver `carsAt` — así que el estado no crece con el tráfico y
   * es puro sin esfuerzo: el mismo tick siempre dibuja la misma calle.
   */
  ticks: number;
  /** Filas que hay que cruzar para ganar. */
  target: number;
  /**
   * Qué proporción de las filas son calle.
   *
   * Viaja en el estado y no se busca por nivel: la vista necesita el mismo
   * número para dibujar el mismo mundo que el motor evalúa, y una tabla copiada
   * en dos archivos se separa el día que alguien ajusta uno solo.
   */
  traffic: number;
  baseMs: number;
  dead: boolean;
  seed: string;
}

export interface CrossingConfig {
  cols: number;
  rows: number;
  target: number;
  baseMs: number;
  /** De 0 a 1: qué proporción de las filas son calle. */
  traffic: number;
}
