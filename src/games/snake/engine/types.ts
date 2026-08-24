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
  /**
   * El giro de DESPUÉS del pendiente, si el jugador ya lo pidió.
   *
   * Dos y no uno porque con uno solo se perdían giros, y se sentía como que el
   * juego no respondía. Yendo a la derecha, pedir "arriba" y enseguida
   * "izquierda" se rechazaba —izquierda es opuesta a derecha— aunque después de
   * girar arriba fuera perfectamente legal; y si se aceptaba, pisaba al
   * anterior, que entonces no ocurría nunca.
   *
   * Con dos, cada pedido se valida contra el ÚLTIMO ENCOLADO y no contra el
   * rumbo actual, así que una esquina se dibuja de un solo movimiento del
   * pulgar. Tres no: encolar más de lo que se ve en pantalla es jugar a ciegas.
   */
  queued: Heading | null;
  /**
   * Si la serpiente ya está apoyada contra la pared, gastando su paso de gracia.
   *
   * Es el "borde invisible": la primera vez que un paso daría contra la pared la
   * serpiente se queda quieta en vez de morir, y ese paso —entre 125 y 220 ms
   * según el nivel— es el que alcanza para girar. Cuando ves la cabeza en la
   * última casilla, el paso que la mata ya venía en camino; sin esta pausa el
   * giro llegaba siempre tarde y el borde se sentía injusto.
   */
  grace: boolean;
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
