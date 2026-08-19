/** Hacia dónde se empuja el tablero entero. No hay jugada por casilla. */
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Game2048Move {
  dir: Direction;
}

export interface Game2048State {
  size: number;
  /** Valor de cada casilla, por fila. 0 es vacía. */
  tiles: number[];
  /** La ficha a la que hay que llegar para ganar. La decide la dificultad. */
  target: number;
  score: number;
  /**
   * La semilla de la partida y cuántas fichas aparecieron hasta ahora.
   *
   * El azar de este juego no puede vivir afuera del estado. `applyMove` tiene
   * que ser pura — de eso dependen deshacer, rehacer y el autoguardado — y una
   * ficha que aparece llamando a Math.random() rompe las tres a la vez: al
   * deshacer y rehacer la misma jugada saldría otro tablero, y el guardado no
   * describiría la partida que estabas jugando.
   *
   * Con la semilla y el contador adentro, la ficha nueva es una FUNCIÓN del
   * estado anterior. Misma jugada sobre el mismo tablero, misma ficha, siempre.
   */
  seed: string;
  spawns: number;
}

export interface Game2048Config {
  size: number;
  target: number;
}
