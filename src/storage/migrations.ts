import { SCHEMA_VERSION } from './types';

/**
 * Record migrations.
 *
 * The point of this file is that it exists BEFORE it is needed. The first time
 * a record shape changes, every saved game out there is already tagged with the
 * version it was written under, and there is a place to put the upgrade. Adding
 * versioning after the fact is impossible: the old records carry no version to
 * branch on.
 *
 * A migration takes a record at version N and returns it at version N + 1. They
 * run in sequence, so a v1 record reaches the current version by passing through
 * every step — no migration ever needs to know about more than its own hop.
 */

export type Migration = (record: Record<string, unknown>) => Record<string, unknown>;

/**
 * Keyed by the version being migrated FROM.
 *
 * Empty, and that is the honest state of things: the record shape has not
 * changed since it was introduced. The runner below is what is actually being
 * built here, and it is tested with its own synthetic chain.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export class UnknownSchemaVersionError extends Error {
  constructor(found: number) {
    super(
      `Record was saved with schemaVersion ${String(found)}, which this build ` +
        `(${String(SCHEMA_VERSION)}) does not understand. Refusing to guess.`
    );
    this.name = 'UnknownSchemaVersionError';
  }
}

/**
 * Walks a record up to `target`.
 *
 * A record from the FUTURE is rejected rather than read optimistically: a newer
 * build may have added a field this one would silently drop, and dropping a
 * user's data quietly is worse than refusing to open it.
 */
export function migrate(
  record: Record<string, unknown>,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
  target: number = SCHEMA_VERSION
): Record<string, unknown> {
  const from = typeof record['schemaVersion'] === 'number' ? record['schemaVersion'] : 0;

  if (from > target) throw new UnknownSchemaVersionError(from);
  if (from === target) return record;

  let current = record;
  for (let version = from; version < target; version++) {
    const step = migrations[version];
    if (!step) throw new UnknownSchemaVersionError(from);
    current = { ...step(current), schemaVersion: version + 1 };
  }
  return current;
}
