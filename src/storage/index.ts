import { type StorageDriver } from './driver';
import { IndexedDbDriver } from './indexedDbDriver';
import { LocalStorageDriver } from './localStorageDriver';

export { CorruptBackupError, parseBackup, type StorageDriver } from './driver';
export { migrate, UnknownSchemaVersionError, type Migration } from './migrations';
export { computeGlobalStats, computeStats } from './stats';
export { IndexedDbDriver } from './indexedDbDriver';
export { LocalStorageDriver } from './localStorageDriver';
export { SCHEMA_VERSION } from './types';
export type {
  Backup,
  GameResult,
  GameStats,
  GlobalStats,
  Outcome,
  SavedSession,
  StoredPreference,
} from './types';

/**
 * Picks the best driver this browser will allow.
 *
 * The check is a feature probe, not a browser sniff: Firefox in private mode
 * exposes `indexedDB` and then fails on open, so the real fallback also happens
 * lazily inside the driver when a call rejects.
 */
export function createStorage(): StorageDriver {
  try {
    if (typeof indexedDB !== 'undefined') return new IndexedDbDriver();
  } catch {
    /* fall through */
  }
  return new LocalStorageDriver();
}
