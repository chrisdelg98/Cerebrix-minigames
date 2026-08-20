import { beforeEach, describe, expect, it } from 'vitest';

import { REGISTRY } from '@core/registry';
import { SCHEMA_VERSION } from '@storage/index';
import { LocalStorageDriver } from '@storage/localStorageDriver';

/**
 * La limpieza de datos que quedaron sin dueño.
 *
 * El almacenamiento vive en el teléfono de cada jugador y no se puede alcanzar
 * desde ningún lado, así que un juego renombrado o eliminado deja basura ahí
 * para siempre a menos que la app se limpie sola.
 */

let storage: LocalStorageDriver;

const session = (gameId: string) => ({
  schemaVersion: SCHEMA_VERSION,
  gameId,
  stateVersion: 1,
  difficulty: 1,
  state: '{}',
  elapsedMs: 0,
  savedAt: Date.now(),
});

const result = (gameId: string) => ({
  schemaVersion: SCHEMA_VERSION,
  gameId,
  difficulty: 1 as const,
  outcome: 'won' as const,
  elapsedMs: 1000,
  finishedAt: Date.now(),
});

beforeEach(() => {
  localStorage.clear();
  storage = new LocalStorageDriver();
});

describe('retainGames', () => {
  it('borra la partida, la preferencia y el historial de un id que ya no existe', async () => {
    await storage.saveSession('fantasma', session('fantasma'));
    await storage.saveDifficulty('fantasma', 3);
    await storage.recordResult('fantasma', result('fantasma'));

    const dropped = await storage.retainGames(['sudoku']);

    expect(dropped).toEqual(['fantasma']);
    expect(await storage.loadSession('fantasma')).toBeNull();
    expect(await storage.loadDifficulty('fantasma')).toBeNull();
    expect(await storage.listResults()).toHaveLength(0);
  });

  it('no toca los juegos que siguen en el registro', async () => {
    await storage.saveSession('sudoku', session('sudoku'));
    await storage.saveDifficulty('sudoku', 4);
    await storage.recordResult('sudoku', result('sudoku'));

    const dropped = await storage.retainGames(['sudoku', 'snake']);

    expect(dropped).toEqual([]);
    expect(await storage.loadSession('sudoku')).not.toBeNull();
    expect(await storage.loadDifficulty('sudoku')).toBe(4);
    expect(await storage.listResults()).toHaveLength(1);
  });

  /*
   * El caso que motivó todo esto: renombrar un id. Desde el storage, un juego
   * renombrado y uno eliminado son exactamente lo mismo — datos de una clave
   * que el registro ya no reconoce — y por eso una sola operación cubre los dos.
   */
  it('trata un id renombrado igual que uno eliminado', async () => {
    await storage.saveSession('apagon', session('apagon'));
    await storage.saveSession('lights-out', session('lights-out'));

    const dropped = await storage.retainGames(['lights-out']);

    expect(dropped).toEqual(['apagon']);
    expect(await storage.listSessions()).toHaveLength(1);
  });

  it('separa juegos cuyo id es prefijo de otro', async () => {
    await storage.saveSession('lights', session('lights'));
    await storage.saveSession('lights-out', session('lights-out'));

    await storage.retainGames(['lights-out']);

    const alive = (await storage.listSessions()).map((s) => s.gameId);
    expect(alive, 'se llevó puesto al que solo compartía el prefijo').toEqual(['lights-out']);
  });

  it('no rompe cuando no hay nada guardado', async () => {
    expect(await storage.retainGames(['sudoku'])).toEqual([]);
  });
});

describe('los ids del registro', () => {
  /*
   * El estándar: el id es una clave neutral al idioma, en inglés y kebab-case.
   * El nombre visible se traduce el día que haya multiidioma; el id no puede,
   * porque vive en la URL y en el teléfono de cada jugador.
   */
  it('son claves seguras para una URL y para una clave de storage', () => {
    for (const entry of REGISTRY) {
      expect(entry.id, `"${entry.id}" no es kebab-case ASCII`).toMatch(/^[a-z0-9_][a-z0-9-]*$/);
      expect(entry.id).toBe(encodeURIComponent(entry.id));
    }
  });

  it('no se repiten', () => {
    const ids = REGISTRY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
