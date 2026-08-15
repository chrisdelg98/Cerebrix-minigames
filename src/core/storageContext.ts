import { createContext, useContext } from 'react';

import { createStorage, type StorageDriver } from '@storage/index';

/**
 * The shell reaches persistence through this and never through IndexedDB
 * directly. Injectable so tests can run against an in-memory driver instead of
 * whatever the environment happens to provide.
 */
export const StorageContext = createContext<StorageDriver | null>(null);

let ambient: StorageDriver | null = null;

export function useStorage(): StorageDriver {
  const injected = useContext(StorageContext);
  if (injected) return injected;

  // Created once, on first use — opening a database at module load would cost
  // every visitor the connection even if they never start a game.
  ambient ??= createStorage();
  return ambient;
}
