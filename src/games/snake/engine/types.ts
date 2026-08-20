export type Heading = 'up' | 'down' | 'left' | 'right';

export interface SnakeMove {
  heading: Heading;
}

export interface SnakeState {
  cols: number;
  rows: number;
  /**
   * El cuerpo, la cabeza primero.
   *
   * Un array y no un set: el orden ES el juego. La cola se descarta por el
   * final y la cabeza crece por el principio, y la vista dibuja cada segmento
   * por su posición en la lista para que el movimiento se deslice.
   */
  body: number[];
  heading: Heading;
  /**
   * Hacia dónde pidió girar el jugador, todavía sin aplicar.
   *
   * El giro no se aplica en el acto a propósito. Si se aplicara, dos toques
   * rápidos entre un paso y el siguiente podrían darte vuelta 180° —arriba,
   * después izquierda, y el paso siguiente te mete en tu propio cuello— y la
   * muerte no se parecería a nada que el jugador vio en pantalla. Encolado, el
   * reloj aplica uno por paso y cada muerte tiene una causa visible.
   */
  pending: Heading | null;
  food: number;
  /** Largo al que hay que llegar para ganar. Lo decide la dificultad. */
  target: number;
  /** Cuánto dura un paso al empezar. Se acorta a medida que crecés. */
  baseMs: number;
  dead: boolean;
  seed: string;
  /** Cuántas frutas aparecieron. Con la semilla, decide dónde cae la próxima. */
  spawns: number;
}

export interface SnakeConfig {
  cols: number;
  rows: number;
  target: number;
  baseMs: number;
}
