import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from '@core/router';
import { StorageContext } from '@core/storageContext';
import { LocalStorageDriver } from '@storage/localStorageDriver';
import { SCHEMA_VERSION } from '@storage/types';

/**
 * Phase 3 acceptance (docs/PLAN.md): play the dummy, kill the tab, reopen —
 * exact state, timer included.
 *
 * jsdom has no IndexedDB, so these run against the localStorage fallback. Both
 * drivers are held to the same contract in tests/storage.test.ts, so what is
 * exercised here is the SHELL's use of storage, not one implementation of it.
 */

let storage: LocalStorageDriver;

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const utils = render(
    <StorageContext.Provider value={storage}>
      <RouterProvider router={router} />
    </StorageContext.Provider>
  );
  return { user: userEvent.setup(), ...utils };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storage = new LocalStorageDriver();
});

describe('autosave and resume', () => {
  it('restores the exact board after the tab is killed', async () => {
    const first = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    await first.user.click(tiles[0]!);
    await first.user.click(tiles[2]!);

    // The debounce is 400ms; the save has to have landed on its own.
    await waitFor(async () => {
      expect(await storage.loadSession('_dummy')).not.toBeNull();
    });

    // The tab dies. Nothing gets a chance to run on the way out.
    first.unmount();

    renderAt('/game/_dummy');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Casilla 1, marcada' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Casilla 3, marcada' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Casilla 2' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('resumes the clock where it stopped, not from zero', async () => {
    await storage.saveSession('_dummy', {
      schemaVersion: SCHEMA_VERSION,
      gameId: '_dummy',
      stateVersion: 1,
      difficulty: 3,
      state: '{"v":1,"tiles":[true,true,true,false,false,false]}',
      elapsedMs: 65_000,
      savedAt: Date.now(),
    });

    renderAt('/game/_dummy');

    // Re-queried inside the wait: adopting the saved level changes the round,
    // which remounts the timer — a node captured before that is stale.
    await waitFor(() => {
      expect(screen.getByRole('timer').textContent).toBe('01:05');
    });
  });

  it('flushes on visibilitychange instead of waiting out the debounce', async () => {
    const save = vi.spyOn(storage, 'saveSession');
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    save.mockClear();
    await user.click(tiles[0]!);

    // The system is about to kill the tab: no timer will get to fire.
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(save).toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('records the result and drops the save when the game ends', async () => {
    const { user } = renderAt('/game/_dummy');

    await user.click(await screen.findByRole('button', { name: 'Ganar' }));
    await screen.findByRole('heading', { name: '¡Ganaste!' });

    await waitFor(async () => {
      expect((await storage.getStats('_dummy')).completed).toBe(1);
    });
    // Nothing left to continue.
    expect(await storage.loadSession('_dummy')).toBeNull();
  });

  it('starts a genuinely new board when the player asks for one', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    await user.click(tiles[0]!);
    await waitFor(async () => {
      expect(await storage.loadSession('_dummy')).not.toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Nueva partida' }));

    // A restart is an explicit request: it must not resurrect the save.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Casilla 1' })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });
  });
});

describe('Home reflects what is stored', () => {
  it('offers to continue only the games that have something saved', async () => {
    renderAt('/');

    const cards = await screen.findAllByRole('listitem');
    expect(within(cards[0]!).queryByText('Continuar')).not.toBeInTheDocument();

    await storage.saveSession('_dummy', {
      schemaVersion: SCHEMA_VERSION,
      gameId: '_dummy',
      stateVersion: 1,
      difficulty: 3,
      state: '{"v":1,"tiles":[true,false,false,false,false,false]}',
      elapsedMs: 1_000,
      savedAt: Date.now(),
    });

    renderAt('/');

    await waitFor(() => {
      expect(screen.getAllByText('Continuar').length).toBeGreaterThan(0);
    });
  });

  it('shows the stats bar once something has been played', async () => {
    await storage.recordResult('_dummy', {
      schemaVersion: SCHEMA_VERSION,
      gameId: '_dummy',
      difficulty: 3,
      outcome: 'won',
      elapsedMs: 30_000,
      finishedAt: Date.now(),
    });

    renderAt('/');

    const stats = await screen.findByRole('region', { name: 'Tus estadísticas' });
    expect(within(stats).getByText('Partidas')).toBeInTheDocument();
    expect(within(stats).getByText('Éxito')).toBeInTheDocument();
  });
});
