export interface SequenceState {
  /** Cuántas pastillas hay en el tablero. */
  pads: number;
  /**
   * La secuencia entera, sorteada al empezar.
   *
   * Se genera completa y de una en vez de agregar un color por ronda: el motor
   * tiene que ser puro, y una partida que sortea sobre la marcha no se puede
   * volver a jugar ni guardar sin arrastrar el estado del azar. El jugador solo
   * ve los primeros `round` pasos.
   */
  sequence: number[];
  /** Cuántos pasos se muestran en esta ronda. */
  round: number;
  /** Cuántos repitió bien dentro de la ronda. */
  progress: number;
  /** Rondas que hay que superar para ganar. */
  target: number;
  lost: boolean;
  /** Cuánto dura cada destello. Lo decide el juego, lo respeta la vista. */
  tempoMs: number;
}

export interface SequenceMove {
  pad: number;
}

export interface SequenceConfig {
  pads: number;
  target: number;
  tempoMs: number;
}
