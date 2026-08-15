// `idb` reaches for IDBRequest, IDBTransaction and friends as globals, not just
// indexedDB itself, so the whole set has to be installed — hence /auto.
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';

import { CorruptBackupError, type StorageDriver } from '@storage/driver';
import { IndexedDbDriver } from '@storage/indexedDbDriver';
import { LocalStorageDriver } from '@storage/localStorageDriver';
import { migrate, UnknownSchemaVersionError, type Migration } from '@storage/migrations';
import { computeGlobalStats, computeStats } from '@storage/stats';
import { SCHEMA_VERSION, type GameResult, type SavedSession } from '@storage/types';

/**
 * One contract suite, run against BOTH drivers.
 *
 * The fallback is not a second-class path: a browser in private mode gets it,
 * and a divergence between the two is exactly the bug that only shows up for
 * the users least able to report it.
 */

function session(overrides: Partial<SavedSession> = {}): SavedSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: '_dummy',
    stateVersion: 1,
    difficulty: 3,
    state: '{"v":1,"tiles":[true,false,false]}',
    elapsedMs: 12_000,
    savedAt: 1_700_000_000_000,
    ...overrides,
  };
}

function result(overrides: Partial<GameResult> = {}): GameResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    gameId: '_dummy',
    difficulty: 3,
    outcome: 'won',
    elapsedMs: 30_000,
    finishedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const drivers: { name: string; create: () => StorageDriver }[] = [
  {
    name: 'IndexedDbDriver',
    create: () => {
      // A fresh database per test: fake-indexeddb keeps state on the factory.
      globalThis.indexedDB = new IDBFactory();
      return new IndexedDbDriver();
    },
  },
  {
    name: 'LocalStorageDriver',
    create: () => {
      localStorage.clear();
      return new LocalStorageDriver();
    },
  },
];

describe.each(drivers)('$name', ({ create }) => {
  let storage: StorageDriver;

  beforeEach(() => {
    storage = create();
  });

  it('round-trips a saved session', async () => {
    await storage.saveSession('_dummy', session());

    expect(await storage.loadSession('_dummy')).toMatchObject({
      gameId: '_dummy',
      difficulty: 3,
      elapsedMs: 12_000,
      state: '{"v":1,"tiles":[true,false,false]}',
    });
  });

  it('returns null for a game with nothing saved', async () => {
    expect(await storage.loadSession('nope')).toBeNull();
  });

  it('lists every game that has something to continue', async () => {
    await storage.saveSession('_dummy', session());
    await storage.saveSession('other', session({ gameId: 'other' }));

    const ids = (await storage.listSessions()).map((s) => s.gameId).sort();
    expect(ids).toEqual(['_dummy', 'other']);
  });

  it('clears a session', async () => {
    await storage.saveSession('_dummy', session());
    await storage.clearSession('_dummy');

    expect(await storage.loadSession('_dummy')).toBeNull();
  });

  it('derives stats from recorded results', async () => {
    await storage.recordResult('_dummy', result({ elapsedMs: 30_000, finishedAt: 1 }));
    await storage.recordResult(
      '_dummy',
      result({ outcome: 'lost', elapsedMs: 10_000, finishedAt: 2 })
    );
    await storage.recordResult('_dummy', result({ elapsedMs: 20_000, finishedAt: 3 }));

    const stats = await storage.getStats('_dummy');
    expect(stats.played).toBe(3);
    expect(stats.completed).toBe(2);
    expect(stats.successRate).toBeCloseTo(2 / 3);
    expect(stats.totalMs).toBe(60_000);
    expect(stats.bestMsByDifficulty[3]).toBe(20_000);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(1);
  });

  it('round-trips an export through an import', async () => {
    await storage.saveSession('_dummy', session());
    await storage.recordResult('_dummy', result());

    const backup = await storage.exportAll();

    await storage.clearSession('_dummy');
    expect(await storage.loadSession('_dummy')).toBeNull();

    await storage.importAll(backup);

    expect(await storage.loadSession('_dummy')).toMatchObject({ elapsedMs: 12_000 });
    expect((await storage.getStats('_dummy')).played).toBe(1);
  });

  it('rejects a malformed backup WITHOUT touching what is already stored', async () => {
    await storage.saveSession('_dummy', session());

    await expect(storage.importAll('this is not json')).rejects.toBeInstanceOf(CorruptBackupError);
    await expect(storage.importAll('{"nope":true}')).rejects.toBeInstanceOf(CorruptBackupError);

    // The point of validating before deleting.
    expect(await storage.loadSession('_dummy')).not.toBeNull();
  });

  it('remembers a per-game difficulty, separately from the session', async () => {
    expect(await storage.loadDifficulty('_dummy')).toBeNull();

    await storage.saveDifficulty('_dummy', 5);
    await storage.saveDifficulty('other', 1);

    expect(await storage.loadDifficulty('_dummy')).toBe(5);
    expect(await storage.loadDifficulty('other')).toBe(1);
  });

  it('keeps the difficulty when the session it was played in is cleared', async () => {
    await storage.saveDifficulty('_dummy', 5);
    await storage.saveSession('_dummy', session({ difficulty: 5 }));

    // What happens at the end of every game.
    await storage.clearSession('_dummy');

    expect(await storage.loadSession('_dummy')).toBeNull();
    expect(await storage.loadDifficulty('_dummy')).toBe(5);
  });

  it('carries preferences through an export and back', async () => {
    await storage.saveDifficulty('_dummy', 5);
    const backup = await storage.exportAll();

    await storage.saveDifficulty('_dummy', 1);
    await storage.importAll(backup);

    expect(await storage.loadDifficulty('_dummy')).toBe(5);
  });

  it('still accepts a backup written before preferences existed', async () => {
    const old = JSON.stringify({ schemaVersion: 1, exportedAt: 1, sessions: [], results: [] });

    // Additive and optional: refusing it would strand every older export.
    await expect(storage.importAll(old)).resolves.toBeUndefined();
  });

  it('drops a session it cannot read instead of failing forever', async () => {
    // A record from a build that does not exist yet.
    await storage.saveSession('_dummy', session({ schemaVersion: 99 }));

    expect(await storage.loadSession('_dummy')).toBeNull();
  });
});

describe('migrations', () => {
  it('leaves a current-version record untouched', () => {
    const record = { schemaVersion: SCHEMA_VERSION, gameId: '_dummy' };
    expect(migrate(record)).toBe(record);
  });

  it('refuses a record from a newer build rather than dropping its fields', () => {
    expect(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 })).toThrow(UnknownSchemaVersionError);
  });

  it('walks a record through every hop in order', () => {
    // The real table is empty — nothing has changed shape yet — so the runner
    // is exercised with its own chain. This is the machinery the first real
    // migration will drop into.
    const chain: Record<number, Migration> = {
      1: (record) => ({ ...record, added: 'in v2' }),
      2: (record) => ({ ...record, added: String(record['added']).toUpperCase() }),
    };

    const migrated = migrate({ schemaVersion: 1, keep: 'me' }, chain, 3);

    expect(migrated).toEqual({ schemaVersion: 3, keep: 'me', added: 'IN V2' });
  });

  it('refuses when a hop is missing rather than skipping it', () => {
    expect(() => migrate({ schemaVersion: 1 }, { 2: (r) => r }, 3)).toThrow(
      UnknownSchemaVersionError
    );
  });
});

describe('stats', () => {
  it('counts a streak of wins and breaks it on a loss', () => {
    const stats = computeStats('_dummy', [
      result({ finishedAt: 1 }),
      result({ finishedAt: 2 }),
      result({ finishedAt: 3, outcome: 'lost' }),
      result({ finishedAt: 4 }),
      result({ finishedAt: 5 }),
    ]);

    expect(stats.currentStreak).toBe(2);
    expect(stats.bestStreak).toBe(2);
  });

  it('orders by finish time, not by insertion order', () => {
    const stats = computeStats('_dummy', [
      result({ finishedAt: 5 }),
      result({ finishedAt: 1, outcome: 'lost' }),
    ]);

    expect(stats.currentStreak).toBe(1);
    expect(stats.lastPlayedAt).toBe(5);
  });

  it('keeps the best time per difficulty, not overall', () => {
    const stats = computeStats('_dummy', [
      result({ difficulty: 1, elapsedMs: 5_000 }),
      result({ difficulty: 5, elapsedMs: 90_000 }),
      result({ difficulty: 5, elapsedMs: 70_000 }),
    ]);

    expect(stats.bestMsByDifficulty).toEqual({ 1: 5_000, 5: 70_000 });
  });

  it('never reports NaN for an empty history', () => {
    const stats = computeStats('_dummy', []);

    expect(stats.successRate).toBe(0);
    expect(stats.lastPlayedAt).toBeNull();
  });

  it('separates per-game stats inside the global ones', () => {
    const global = computeGlobalStats([
      result({ gameId: 'a', finishedAt: 1 }),
      result({ gameId: 'b', finishedAt: 2, outcome: 'lost' }),
    ]);

    expect(global.played).toBe(2);
    expect(global.byGame['a']?.completed).toBe(1);
    expect(global.byGame['b']?.completed).toBe(0);
  });
});
