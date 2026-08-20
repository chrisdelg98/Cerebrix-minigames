import { type ComponentType } from 'react';

import { type Difficulty, type GameMeta, type GameStatus } from './contract';

/**
 * El contrato de los juegos con reloj — docs/GAME_CONTRACT.md §8.
 *
 * Existe aparte del contrato por turnos porque son formas distintas, no
 * variantes de la misma. En un juego por turnos el jugador produce cada estado:
 * deshacer significa algo y un tablero a medias se puede guardar y retomar. Acá
 * el estado lo produce el reloj aunque el jugador no haga nada, así que
 * deshacer no significa nada y una partida a medias no se reanuda — se anota el
 * resultado y se vuelve a empezar, como el arcade de verdad.
 *
 * Meterlos en un solo contrato le habría dado a cada juego por turnos un `tick`
 * que nunca implementa y a cada juego con reloj un `serialize`, un
 * `deserialize` y un `supportsUndo` que nunca usa. Este repo ya tomó esa
 * decisión cuando sacó `toggle` de `GameAction`: superficie que nadie puede
 * usar es peor que no tener superficie.
 *
 * Lo que NO se separa: /design, /storage, la portada, el historial y el
 * registro de resultados son los mismos. La única diferencia es quién produce
 * el estado.
 */

/** Todo lo que describe a un juego, menos lo que solo tiene sentido por turnos. */
export type ArcadeMeta = Omit<GameMeta, 'supportsUndo' | 'stateVersion'>;

export interface ArcadeEngine<TState, TMove, TConfig = unknown> {
  getDifficultyConfig(difficulty: Difficulty): TConfig;

  /** Sin promesa: un arcade arranca ya, no espera a generar nada. */
  createInitialState(config: TConfig, seed?: string): TState;

  /**
   * Un paso del reloj. Es lo único que este contrato agrega, y lo que lo
   * justifica: acá el mundo avanza sin que nadie toque la pantalla.
   */
  tick(state: TState): TState;

  /**
   * Cuánto falta para el paso siguiente.
   *
   * Se pregunta al estado y no a la configuración para que un juego pueda
   * acelerar mientras se juega, que es de lo que vive el género.
   */
  tickMs(state: TState): number;

  /**
   * La entrada del jugador. NO adelanta el reloj: en Snake girar no te mueve,
   * cambia hacia dónde te va a mover el próximo tick.
   */
  applyMove(state: TState, move: TMove): TState;

  checkStatus(state: TState): GameStatus;

  /** De 0 a 1, para la barra del shell. */
  getProgress(state: TState): number;
}

/** Lo que el shell le pasa a la vista. Sin pista, sin rechazo, sin deshacer. */
export interface ArcadeViewProps<TState, TMove> {
  state: TState;
  dispatch: (move: TMove) => void;
  status: GameStatus;
  difficulty: Difficulty;
  /** Falso mientras está en pausa o cuando la partida terminó. */
  interactive: boolean;
  /** Cuánto dura el paso actual, para que la vista sincronice su animación. */
  stepMs: number;
}

export interface ArcadeModule<TState = unknown, TMove = unknown, TConfig = unknown> {
  meta: ArcadeMeta;
  engine: ArcadeEngine<TState, TMove, TConfig>;
  View: ComponentType<ArcadeViewProps<TState, TMove>>;
}

export type AnyArcadeModule = ArcadeModule<unknown, unknown, unknown>;

/**
 * El punto de borrado, igual que `defineGame`. Mismo motivo: las props de un
 * componente están en posición contravariante, así que ninguna anotación de
 * varianza hace asignable un módulo concreto al borrado.
 */
export function defineArcade<TState, TMove, TConfig>(
  module: ArcadeModule<TState, TMove, TConfig>
): AnyArcadeModule {
  return module as unknown as AnyArcadeModule;
}
