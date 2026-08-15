import {
  type Backup,
  type GameResult,
  type GameStats,
  type GlobalStats,
  type SavedSession,
} from './types';

/**
 * The persistence port. Everything above it — the shell, the games — talks to
 * this and never to IndexedDB, localStorage or, one day, a backend.
 * Reference: docs/PLAN.md, Phase 3.
 */
export interface StorageDriver {
  /** A name for diagnostics: which implementation actually ended up running. */
  readonly kind: 'indexeddb' | 'localstorage' | 'memory';

  saveSession(gameId: string, session: SavedSession): Promise<void>;
  loadSession(gameId: string): Promise<SavedSession | null>;
  clearSession(gameId: string): Promise<void>;
  /** Which games have something to continue, in one round trip. */
  listSessions(): Promise<SavedSession[]>;

  recordResult(gameId: string, result: GameResult): Promise<void>;
  /** The raw log, newest first — what the history view reads. */
  listResults(): Promise<GameResult[]>;
  getStats(gameId: string): Promise<GameStats>;
  getGlobalStats(): Promise<GlobalStats>;

  /** Per-game difficulty, remembered across sessions. Null when never chosen. */
  saveDifficulty(gameId: string, difficulty: number): Promise<void>;
  loadDifficulty(gameId: string): Promise<number | null>;

  exportAll(): Promise<string>;
  importAll(json: string): Promise<void>;
}

export class CorruptBackupError extends Error {
  constructor(detail: string) {
    super(`This file is not a Cerebrix backup: ${detail}`);
    this.name = 'CorruptBackupError';
  }
}

/**
 * Import replaces everything, so a malformed file must be rejected BEFORE the
 * first delete — half-importing over someone's history is unrecoverable.
 */
export function parseBackup(json: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new CorruptBackupError('not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new CorruptBackupError('not an object');
  }

  const candidate = parsed as Partial<Backup>;
  if (!Array.isArray(candidate.sessions) || !Array.isArray(candidate.results)) {
    throw new CorruptBackupError('missing sessions or results');
  }

  return {
    schemaVersion: typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : 0,
    exportedAt: typeof candidate.exportedAt === 'number' ? candidate.exportedAt : Date.now(),
    sessions: candidate.sessions,
    results: candidate.results,
    // Additive and optional: a backup written before preferences existed is
    // still a valid backup, and refusing it would strand old exports.
    preferences: Array.isArray(candidate.preferences) ? candidate.preferences : [],
  };
}
