import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

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
} from './types';

const DB_NAME = 'cerebrix';
const DB_VERSION = 1;

interface CerebrixDb extends DBSchema {
  sessions: {
    key: string;
    value: SavedSession;
  };
  results: {
    key: number;
    value: GameResult & { id?: number };
    indexes: { byGame: string };
  };
}

/**
 * The real driver. IndexedDB rather than localStorage because a saved board is
 * structured data that will only grow, and because localStorage is synchronous:
 * every write blocks the main thread, which is the one thing the 60fps budget
 * cannot afford (docs/DESIGN_SYSTEM.md §5.2).
 */
export class IndexedDbDriver implements StorageDriver {
  readonly kind = 'indexeddb' as const;

  #db: Promise<IDBPDatabase<CerebrixDb>> | null = null;

  #open(): Promise<IDBPDatabase<CerebrixDb>> {
    this.#db ??= openDB<CerebrixDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Object stores are structural; the RECORD shape is versioned
        // separately by schemaVersion, so a shape change does not force a
        // database version bump and a blocked upgrade on an open tab.
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'gameId' });
        }
        if (!db.objectStoreNames.contains('results')) {
          const results = db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
          results.createIndex('byGame', 'gameId');
        }
      },
    });
    return this.#db;
  }

  async saveSession(gameId: string, session: SavedSession): Promise<void> {
    const db = await this.#open();
    await db.put('sessions', { ...session, gameId });
  }

  async loadSession(gameId: string): Promise<SavedSession | null> {
    const db = await this.#open();
    const raw = await db.get('sessions', gameId);
    if (!raw) return null;

    try {
      return migrate(raw as unknown as Record<string, unknown>) as unknown as SavedSession;
    } catch {
      // A session we cannot read is a session we drop: the alternative is
      // wedging the player out of that game forever.
      await this.clearSession(gameId);
      return null;
    }
  }

  async clearSession(gameId: string): Promise<void> {
    const db = await this.#open();
    await db.delete('sessions', gameId);
  }

  async listSessions(): Promise<SavedSession[]> {
    const db = await this.#open();
    return db.getAll('sessions');
  }

  async recordResult(gameId: string, result: GameResult): Promise<void> {
    const db = await this.#open();
    await db.add('results', { ...result, gameId });
  }

  async #allResults(): Promise<GameResult[]> {
    const db = await this.#open();
    return db.getAll('results');
  }

  async getStats(gameId: string): Promise<GameStats> {
    return computeStats(gameId, await this.#allResults());
  }

  async getGlobalStats(): Promise<GlobalStats> {
    return computeGlobalStats(await this.#allResults());
  }

  async exportAll(): Promise<string> {
    const backup: Backup = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: Date.now(),
      sessions: await this.listSessions(),
      results: await this.#allResults(),
    };
    return JSON.stringify(backup, null, 2);
  }

  async importAll(json: string): Promise<void> {
    // Parsed and validated fully before anything is deleted.
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

    const db = await this.#open();
    const tx = db.transaction(['sessions', 'results'], 'readwrite');
    await tx.objectStore('sessions').clear();
    await tx.objectStore('results').clear();
    for (const session of sessions) await tx.objectStore('sessions').put(session);
    for (const result of results) await tx.objectStore('results').add(result);
    await tx.done;
  }
}
