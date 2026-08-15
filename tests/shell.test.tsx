import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { defineGame, type GameViewProps } from '@core/contract';
import { routes } from '@core/router';

/**
 * Phase 1 acceptance (docs/PLAN.md): the dummy is playable from Home, through
 * the real router, with the shell owning the session.
 */

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { user: userEvent.setup(), ...render(<RouterProvider router={router} />) };
}

describe('the shell runs a game it does not know', () => {
  it('navigates from a Home card into the game', async () => {
    const { user } = renderAt('/');

    await user.click(screen.getByRole('link', { name: /Prueba de contrato/ }));

    expect(await screen.findByRole('group', { name: 'Casillas' })).toBeInTheDocument();
  });

  it('plays a move, and the shell reflects it in the progress bar', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    expect(tiles).toHaveLength(6); // difficulty 3 for a game declaring [1, 3, 5]

    await user.click(tiles[0]!);

    expect(tiles[0]!).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '17');
    });
  });

  it('announces a rejected move and leaves the state untouched', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    await user.click(tiles[0]!);
    // Same tile again: the engine says no, so the shell — not the game — reports it.
    await user.click(screen.getByRole('button', { name: 'Casilla 1, marcada' }));

    expect(await screen.findByText(/ya está marcada/)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '17');
    });
  });

  it('undoes a move', async () => {
    const { user } = renderAt('/game/_dummy');

    const tiles = await screen.findAllByRole('button', { name: /^Casilla/ });
    const undo = screen.getByRole('button', { name: 'Deshacer' });
    expect(undo).toBeDisabled();

    await user.click(tiles[0]!);
    await waitFor(() => {
      expect(undo).toBeEnabled();
    });

    await user.click(undo);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Casilla 1' })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    });
  });

  it('runs the game-supplied action and shows the shell victory state', async () => {
    const { user } = renderAt('/game/_dummy');

    await user.click(await screen.findByRole('button', { name: 'Ganar' }));

    // The outcome is announced by the modal's accessible name, and only there.
    expect(await screen.findByRole('heading', { name: '¡Ganaste!' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('button', { name: 'Jugar otra vez' })).toBeInTheDocument();
  });

  it('offers only the difficulties the game declares', async () => {
    renderAt('/game/_dummy');

    const picker = await screen.findByRole('radiogroup', { name: 'Dificultad' });
    const levels = within(picker).getAllByRole('radio');

    expect(levels.map((level) => level.textContent)).toEqual(['Fácil', 'Normal', 'Experto']);
    expect(levels[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('rebuilds the board when the difficulty changes', async () => {
    const { user } = renderAt('/game/_dummy');

    const picker = await screen.findByRole('radiogroup', { name: 'Dificultad' });
    await user.click(within(picker).getByRole('radio', { name: 'Experto' }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Casilla/ })).toHaveLength(9);
    });
  });

  it('falls back to Not Found for an id absent from the registry', async () => {
    renderAt('/game/does-not-exist');

    expect(await screen.findByText(/no está en el registro/)).toBeInTheDocument();
  });
});

/**
 * The strongest statement of the contract: a module invented inside this test,
 * with its own state shape, runs in the shell untouched.
 */
describe('the contract, not the game', () => {
  it('accepts a module the shell has never heard of', () => {
    const invented = defineGame<{ word: string }, { letter: string }, { length: number }>({
      meta: {
        id: '__invented__',
        name: 'Inventado',
        tagline: 'Existe solo dentro de este test.',
        icon: () => <svg aria-hidden="true" />,
        difficulties: [1],
        tags: ['memoria'],
        estimatedMinutes: [1, 1],
        stateVersion: 1,
      },
      engine: {
        getDifficultyConfig: () => ({ length: 3 }),
        createInitialState: () => ({ word: '' }),
        validate: (state, move) =>
          state.word.includes(move.letter) ? { ok: false, reason: 'repetida' } : { ok: true },
        applyMove: (state, move) => ({ word: state.word + move.letter }),
        checkStatus: (state) => (state.word.length >= 3 ? { kind: 'won' } : { kind: 'playing' }),
        getProgress: (state) => state.word.length / 3,
        serialize: (state) => JSON.stringify(state),
        deserialize: (raw) => JSON.parse(raw) as { word: string },
      },
      View: ({ state }: GameViewProps<{ word: string }, { letter: string }>) => <p>{state.word}</p>,
    });

    // Type erasure happened at `defineGame`; the shell only ever sees this shape.
    expect(invented.meta.id).toBe('__invented__');
    expect(invented.engine.getProgress({ word: 'ab' })).toBeCloseTo(2 / 3);
  });
});
