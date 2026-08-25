/**
 * The persistence vocabulary.
 *
 * /storage speaks in primitives on purpose: it cannot import /core, so there is
 * no `Difficulty` here, just a number, and no `GameState`, just the opaque
 * string the engine produced. That is what lets this layer be swapped for a
 * backend later without the games noticing.
 */

/**
 * Version of the RECORD shape written by this layer. It is not the version of a
 * game's state — that one is `stateVersion`, owned by the game, and travels
 * inside the record so the engine can migrate its own shape independently.
 */
export const SCHEMA_VERSION = 1;

export interface SavedSession {
  schemaVersion: number;
  gameId: string;
  /** The game's own state shape version, handed back to `engine.deserialize`. */
  stateVersion: number;
  difficulty: number;
  /**
   * La variante que se estaba jugando, si el juego ofrece más de una.
   *
   * Opcional porque casi ningún juego tiene modos, y porque los guardados que
   * ya existen no lo traen: al leerlos vale `undefined` y se cae en el modo por
   * defecto, que es lo mismo que hacían antes.
   */
  mode?: string;
  /** Produced by `engine.serialize`. Opaque to storage. */
  state: string;
  elapsedMs: number;
  savedAt: number;
}

/**
 * Un empate no es una derrota con otro nombre: para la racha es neutro. Se
 * guarda como lo que fue para que `computeStats` pueda distinguirlo; hacerlo
 * pasar por 'lost' perdería esa diferencia en el momento de escribir, cuando ya
 * no hay forma de recuperarla.
 */
export type Outcome = 'won' | 'lost' | 'draw';

export interface GameResult {
  schemaVersion: number;
  gameId: string;
  difficulty: number;
  outcome: Outcome;
  elapsedMs: number;
  finishedAt: number;
}

export interface GameStats {
  gameId: string;
  played: number;
  completed: number;
  /** 0–1. Zero when nothing has been played, never NaN. */
  successRate: number;
  totalMs: number;
  /** Best time per difficulty level. Only levels actually completed appear. */
  bestMsByDifficulty: Record<number, number>;
  currentStreak: number;
  bestStreak: number;
  lastPlayedAt: number | null;
}

export interface GlobalStats {
  played: number;
  completed: number;
  successRate: number;
  totalMs: number;
  currentStreak: number;
  bestStreak: number;
  byGame: Record<string, GameStats>;
}

/**
 * A choice that outlives the game it was made in.
 *
 * Separate from SavedSession on purpose: a session is cleared the moment the
 * game ends, and the difficulty you picked has to survive that. Storing it
 * inside the session would reset the player to the default after every win.
 */
export interface StoredPreference {
  schemaVersion: number;
  gameId: string;
  difficulty: number;
}

/** The shape of an export file. */
export interface Backup {
  schemaVersion: number;
  exportedAt: number;
  sessions: SavedSession[];
  results: GameResult[];
  /** Absent in backups written before preferences existed. */
  preferences: StoredPreference[];
}

/**
 * Qué pasa al perder una ronda de campaña.
 *
 * `none` es el único que se comporta igual con cualquier conjunto de juegos:
 * la mitad del estante —Sudoku, Shikaku, Nonograma, Lights Out, Trazo, Tango,
 * Queens— **no se puede perder**, así que un castigo duro haría que la misma
 * configuración fuera un paseo o un calvario según qué juegos entraran.
 */
export type LossPenalty = 'none' | 'reset' | 'lives';

/**
 * La campaña en curso. Una sola a la vez.
 *
 * Guarda la configuración Y el progreso, incluida **la bolsa a medio vaciar**:
 * el sorteo saca sin reponer hasta agotar el conjunto, y esa promesa se rompe
 * si cerrar la app rearma la bolsa.
 */
export interface CampaignRecord {
  schemaVersion: number;

  /* Configuración, fija desde que arranca. */
  winsPerLevel: number;
  startLevel: number;
  /** Ids de juego, en primitivos: /storage no sabe qué es un juego. */
  pool: string[];
  onLoss: LossPenalty;
  /** Vidas configuradas. Solo cuenta con `onLoss: 'lives'`. */
  lives: number;
  /** Si las vidas se reponen al subir de nivel. */
  refillLives: boolean;

  /* Progreso. */
  level: number;
  wins: number;
  livesLeft: number;
  /** Lo que queda por salir antes de rearmar el conjunto. */
  bag: string[];
  /** El juego de la ronda actual. */
  current: string;
  startedAt: number;
}

/**
 * Un logro ganado.
 *
 * Solo se guardan los que **no se pueden deducir del historial**. "100 partidas
 * jugadas" o "50 ganadas en Fácil" salen de los resultados que ya existen y se
 * recalculan, igual que las estadísticas; "completaste una campaña" no está en
 * ningún resultado, así que hay que grabarlo cuando pasa.
 */
export interface BadgeRecord {
  schemaVersion: number;
  /** Clave en inglés, kebab-case, como los ids de juego. */
  id: string;
  earnedAt: number;
  /** Contexto serializado: con qué configuración se ganó. */
  detail?: string;
}
