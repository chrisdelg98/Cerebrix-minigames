import { CorruptBackupError, parseBackup, type StorageDriver } from './driver';
import { migrate } from './migrations';
import { computeGlobalStats, computeStats } from './stats';
import {
  SCHEMA_VERSION,
  type Backup,
  type GameResult,
  type GameStats,
  type GlobalStats,
  type SavedSession,
  type StoredPreference,
} from './types';

const SESSION_PREFIX = 'cerebrix:session:';
const RESULTS_KEY = 'cerebrix:results';
const DIFFICULTY_PREFIX = 'cerebrix:difficulty:';

/**
 * The fallback, for private-mode browsers and anything where IndexedDB is
 * unavailable or blocked.
 *
 * Same port, same guarantees, worse characteristics: synchronous, and capped
 * around 5 MB. Good enough to not lose a game in progress, which is the point.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly kind = 'localstorage' as const;

  #read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  #write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled. Losing the autosave is bad; taking
      // the app down mid-move because of it is worse.
    }
  }

  saveSession(gameId: string, session: SavedSession): Promise<void> {
    this.#write(`${SESSION_PREFIX}${gameId}`, { ...session, gameId });
    return Promise.resolve();
  }

  loadSession(gameId: string): Promise<SavedSession | null> {
    const raw = this.#read<Record<string, unknown> | null>(`${SESSION_PREFIX}${gameId}`, null);
    if (!raw) return Promise.resolve(null);

    try {
      return Promise.resolve(migrate(raw) as unknown as SavedSession);
    } catch {
      void this.clearSession(gameId);
      return Promise.resolve(null);
    }
  }

  clearSession(gameId: string): Promise<void> {
    try {
      localStorage.removeItem(`${SESSION_PREFIX}${gameId}`);
    } catch {
      /* nothing to do */
    }
    return Promise.resolve();
  }

  listSessions(): Promise<SavedSession[]> {
    const sessions: SavedSession[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === null || !key.startsWith(SESSION_PREFIX)) continue;
        const raw = this.#read<Record<string, unknown> | null>(key, null);
        if (raw) sessions.push(migrate(raw) as unknown as SavedSession);
      }
    } catch {
      /* a broken record must not hide the readable ones */
    }
    return Promise.resolve(sessions);
  }

  #results(): GameResult[] {
    return this.#read<GameResult[]>(RESULTS_KEY, []);
  }

  recordResult(gameId: string, result: GameResult): Promise<void> {
    this.#write(RESULTS_KEY, [...this.#results(), { ...result, gameId }]);
    return Promise.resolve();
  }

  listResults(): Promise<GameResult[]> {
    return Promise.resolve([...this.#results()].sort((a, b) => b.finishedAt - a.finishedAt));
  }

  getStats(gameId: string): Promise<GameStats> {
    return Promise.resolve(computeStats(gameId, this.#results()));
  }

  getGlobalStats(): Promise<GlobalStats> {
    return Promise.resolve(computeGlobalStats(this.#results()));
  }

  saveDifficulty(gameId: string, difficulty: number): Promise<void> {
    this.#write(`${DIFFICULTY_PREFIX}${gameId}`, {
      schemaVersion: SCHEMA_VERSION,
      gameId,
      difficulty,
    });
    return Promise.resolve();
  }

  loadDifficulty(gameId: string): Promise<number | null> {
    const stored = this.#read<StoredPreference | null>(`${DIFFICULTY_PREFIX}${gameId}`, null);
    return Promise.resolve(stored?.difficulty ?? null);
  }

  #preferences(): StoredPreference[] {
    const preferences: StoredPreference[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === null || !key.startsWith(DIFFICULTY_PREFIX)) continue;
        const stored = this.#read<StoredPreference | null>(key, null);
        if (stored) preferences.push(stored);
      }
    } catch {
      /* a broken record must not hide the readable ones */
    }
    return preferences;
  }

  async exportAll(): Promise<string> {
    const backup: Backup = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: Date.now(),
      sessions: await this.listSessions(),
      results: this.#results(),
      preferences: this.#preferences(),
    };
    return JSON.stringify(backup, null, 2);
  }

  async importAll(json: string): Promise<void> {
    const backup = parseBackup(json);
    const sessions = backup.sessions.map(
      (session) => migrate(session as unknown as Record<string, unknown>) as unknown as SavedSession
    );
    const results = backup.results.map(
      (result) => migrate(result as unknown as Record<string, unknown>) as unknown as GameResult
    );

    if (sessions.some((session) => typeof session.gameId !== 'string')) {
      throw new CorruptBackupError('a session has no gameId');
    }

    for (const existing of await this.listSessions()) {
      await this.clearSession(existing.gameId);
    }
    for (const session of sessions) {
      await this.saveSession(session.gameId, session);
    }
    for (const existing of this.#preferences()) {
      try {
        localStorage.removeItem(`${DIFFICULTY_PREFIX}${existing.gameId}`);
      } catch {
        /* nothing to do */
      }
    }
    for (const preference of backup.preferences) {
      await this.saveDifficulty(preference.gameId, preference.difficulty);
    }
    this.#write(RESULTS_KEY, results);
  }
}
