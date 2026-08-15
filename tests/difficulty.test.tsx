import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { asDifficulty, defaultDifficultyFor, difficultyOptions } from '@core/difficulty';
import { routes } from '@core/router';
import { StorageContext } from '@core/storageContext';
import { LocalStorageDriver } from '@storage/localStorageDriver';

/**
 * Phase 4 acceptance (docs/PLAN.md): one picker for every game, each game
 * decides what a level means, the choice survives, and it never throws away a
 * board without asking.
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

const picker = () => screen.findByRole('radiogroup', { name: 'Dificultad' });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storage = new LocalStorageDriver();
});

describe('the scale', () => {
  it('offers only the levels a game declares, in order', () => {
    expect(difficultyOptions([5, 1, 3]).map((o) => o.label)).toEqual([
      'Fácil',
      'Normal',
      'Experto',
    ]);
  });

  it('gives every level a colour token rather than a literal', () => {
    for (const option of difficultyOptions([1, 2, 3, 4, 5])) {
      expect(option.color).toMatch(/^var\(--c-difficulty-[1-5]\)$/);
    }
  });

  it('falls back to the easiest level a game supports', () => {
    expect(defaultDifficultyFor([1, 3, 5])).toBe(3);
    expect(defaultDifficultyFor([4, 5])).toBe(4);
  });

  it('refuses a stored level the game no longer declares', () => {
    // Storage speaks in primitives and cannot know the scale, so anything
    // coming back from it has to be narrowed before it re-enters.
    expect(asDifficulty(2, [1, 3, 5])).toBeNull();
    expect(asDifficulty(9, [1, 3, 5])).toBeNull();
    expect(asDifficulty(5, [1, 3, 5])).toBe(5);
    expect(asDifficulty(null, [1, 3, 5])).toBeNull();
  });
});

describe('changing difficulty', () => {
  it('takes effect immediately on a board nobody has touched', async () => {
    const { user } = renderAt('/game/_dummy');

    await user.click(within(await picker()).getByRole('radio', { name: 'Experto' }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Casilla/ })).toHaveLength(9);
    });
    // No confirmation for a board with nothing on it — that would be friction.
    expect(
      screen.queryByRole('heading', { name: '¿Cambiar la dificultad?' })
    ).not.toBeInTheDocument();
  });

  it('asks before throwing away a board with moves on it', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    await user.click(tiles[0]!);

    await user.click(within(await picker()).getByRole('radio', { name: 'Experto' }));

    expect(
      await screen.findByRole('heading', { name: '¿Cambiar la dificultad?' })
    ).toBeInTheDocument();
    // Still the old board, still six tiles, still marked.
    expect(screen.getAllByRole('button', { name: /^Casilla/ })).toHaveLength(6);
  });

  it('keeps the board when the player backs out', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    await user.click(tiles[0]!);
    await user.click(within(await picker()).getByRole('radio', { name: 'Experto' }));
    await user.click(await screen.findByRole('button', { name: 'Seguir jugando' }));

    await waitFor(() => {
      expect(
        screen.queryByRole('heading', { name: '¿Cambiar la dificultad?' })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Casilla 1, marcada' })).toBeInTheDocument();
    expect(within(await picker()).getByRole('radio', { name: 'Normal' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('rebuilds the board when the player confirms', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    await user.click(tiles[0]!);
    await user.click(within(await picker()).getByRole('radio', { name: 'Experto' }));
    await user.click(await screen.findByRole('button', { name: 'Empezar de nuevo' }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Casilla/ })).toHaveLength(9);
    });
    expect(screen.getByRole('button', { name: 'Casilla 1' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});

describe('the choice persists', () => {
  it('comes back at the level last chosen for that game', async () => {
    const first = renderAt('/game/_dummy');

    await first.user.click(within(await picker()).getByRole('radio', { name: 'Fácil' }));
    await waitFor(async () => {
      expect(await storage.loadDifficulty('_dummy')).toBe(1);
    });

    first.unmount();
    renderAt('/game/_dummy');

    // Not the default of 3: the level outlives the session it was played in.
    await waitFor(async () => {
      expect(within(await picker()).getByRole('radio', { name: 'Fácil' })).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
    expect(screen.getAllByRole('button', { name: /^Casilla/ })).toHaveLength(3);
  });

  it('lets a saved board win over the remembered level', async () => {
    // The two disagree: the preference says Fácil, the board in progress is
    // Experto. Continuing the board is what the player expects.
    await storage.saveDifficulty('_dummy', 1);
    await storage.saveSession('_dummy', {
      schemaVersion: 1,
      gameId: '_dummy',
      stateVersion: 1,
      difficulty: 5,
      state: '{"v":1,"tiles":[true,false,false,false,false,false,false,false,false]}',
      elapsedMs: 4_000,
      savedAt: Date.now(),
    });

    renderAt('/game/_dummy');

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Casilla/ })).toHaveLength(9);
    });
    expect(within(await picker()).getByRole('radio', { name: 'Experto' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
