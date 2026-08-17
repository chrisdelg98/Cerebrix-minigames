export interface MemoryState {
  cols: number;
  rows: number;
  /** Símbolo de cada carta, por posición. Cada símbolo aparece exactamente dos veces. */
  symbols: number[];
  /** Pares ya encontrados: quedan boca arriba para siempre. */
  matched: boolean[];
  /** Las que están dadas vuelta ahora mismo. Nunca más de dos. */
  up: number[];
  /**
   * Las que el jugador llegó a ver alguna vez.
   *
   * Es la memoria del jugador, hecha explícita. Sin esto la pista solo podría
   * decir dónde está un par — o sea, hacer trampa. Con esto puede razonar sobre
   * lo que él ya vio, que es de lo que trata el juego.
   */
  seen: boolean[];
}

export type MemoryMove = { kind: 'flip'; index: number } | { kind: 'hide' };

export interface MemoryConfig {
  cols: number;
  rows: number;
}
