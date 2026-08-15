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
  /** Produced by `engine.serialize`. Opaque to storage. */
  state: string;
  elapsedMs: number;
  savedAt: number;
}

export type Outcome = 'won' | 'lost';

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

/** The shape of an export file. */
export interface Backup {
  schemaVersion: number;
  exportedAt: number;
  sessions: SavedSession[];
  results: GameResult[];
}
