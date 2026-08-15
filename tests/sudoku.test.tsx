import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '@core/router';
import { StorageContext } from '@core/storageContext';
import { parseGrid } from '@games/sudoku/engine/grid';
import { LocalStorageDriver } from '@storage/localStorageDriver';

import puzzles from '../src/games/sudoku/data/puzzles-1.json';

/**
 * Phase 5a acceptance (docs/PLAN.md): Sudoku playable, saveable and with
 * difficulty, inside the shell — with the whole /core diff being one registry
 * entry.
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

const cellAt = (row: number, col: number) =>
  screen.getByRole('gridcell', {
    name: new RegExp(`^fila ${String(row)}, columna ${String(col)}`),
  });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storage = new LocalStorageDriver();
});

describe('the board', () => {
  it('renders 81 cells with the 3×3 dividers', async () => {
    renderAt('/game/sudoku');

    const grid = await screen.findByRole('grid', { name: 'Tablero de Sudoku' });
    const cells = within(grid).getAllByRole('gridcell');
    expect(cells).toHaveLength(81);

    // Column 3 carries a right divider, column 9 does not — the box edge is
    // inside the board, never on its border.
    expect(cellAt(1, 3)).toHaveAttribute('data-edge-right', 'true');
    expect(cellAt(1, 9)).toHaveAttribute('data-edge-right', 'false');
  });

  it('marks the clues so they read as given, not as the player’s work', async () => {
    renderAt('/game/sudoku');

    const grid = await screen.findByRole('grid', { name: 'Tablero de Sudoku' });
    const clues = within(grid)
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('aria-label')?.includes('pista'));

    expect(clues.length).toBeGreaterThan(20);
  });

  it('highlights the peers of the selected cell, and every twin of its digit', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    // A clue, so there is a digit to find twins of.
    const grid = screen.getByRole('grid', { name: 'Tablero de Sudoku' });
    const clue = within(grid)
      .getAllByRole('gridcell')
      .find((cell) => cell.getAttribute('aria-label')?.includes('pista'));

    await user.click(clue!);

    expect(clue).toHaveAttribute('data-state', 'selected');
    const states = within(grid)
      .getAllByRole('gridcell')
      .map((cell) => cell.getAttribute('data-state'));
    expect(states).toContain('peer');
    expect(states).toContain('same');
  });
});

describe('entering digits', () => {
  it('writes with the number pad into the selected cell', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    const empty = firstEmptyCell();
    await user.click(empty);
    await user.click(screen.getByRole('button', { name: /^Escribir 5/ }));

    await waitFor(() => {
      expect(empty.textContent).toBe('5');
    });
  });

  it('writes with the physical keyboard and erases with Backspace', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    const empty = firstEmptyCell();
    await user.click(empty);
    await user.keyboard('7');

    await waitFor(() => {
      expect(empty.textContent).toBe('7');
    });

    await user.keyboard('{Backspace}');
    await waitFor(() => {
      expect(empty.textContent).toBe('');
    });
  });

  it('moves the selection with the arrow keys', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    await user.click(cellAt(1, 1));
    await user.keyboard('{ArrowDown}{ArrowRight}');

    await waitFor(() => {
      expect(cellAt(2, 2)).toHaveAttribute('data-state', 'selected');
    });
  });

  it('refuses to overwrite a clue, and the shell says why', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    const grid = screen.getByRole('grid', { name: 'Tablero de Sudoku' });
    const clue = within(grid)
      .getAllByRole('gridcell')
      .find((cell) => cell.getAttribute('aria-label')?.includes('pista'));
    const before = clue?.textContent;

    await user.click(clue!);
    await user.keyboard('1');

    expect(await screen.findByText(/pista del puzzle/)).toBeInTheDocument();
    expect(clue?.textContent).toBe(before);
  });

  it('lets a clashing digit through and marks it, instead of blocking it', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    // Find a clue and an empty cell in the same row.
    const grid = screen.getByRole('grid', { name: 'Tablero de Sudoku' });
    const cells = within(grid).getAllByRole('gridcell');
    const clueIndex = cells.findIndex((c) => c.getAttribute('aria-label')?.includes('pista'));
    const clueRow = Math.floor(clueIndex / 9);
    const digit = cells[clueIndex]?.textContent ?? '1';
    const targetIndex = cells.findIndex(
      (c, i) => Math.floor(i / 9) === clueRow && c.getAttribute('aria-label')?.includes('vacía')
    );

    await user.click(cells[targetIndex]!);
    await user.keyboard(digit);

    // Deduction is the game. The digit goes in, and it goes in red.
    await waitFor(() => {
      expect(cells[targetIndex]).toHaveAttribute('data-state', 'error');
    });
    expect(cells[clueIndex]).toHaveAttribute('data-state', 'error');
  });
});

describe('pencil mode', () => {
  it('writes notes instead of digits while it is on', async () => {
    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    const empty = firstEmptyCell();
    await user.click(empty);
    await user.click(screen.getByRole('button', { name: 'Modo lápiz' }));
    await user.click(screen.getByRole('button', { name: /^Escribir 4/ }));

    // The note lands, and the cell is still empty as far as the rules go.
    await waitFor(() => {
      expect(empty.textContent).toBe('4');
    });
    expect(empty.getAttribute('aria-label')).toMatch(/vacía/);

    await user.click(screen.getByRole('button', { name: 'Salir del modo lápiz' }));
    await user.click(screen.getByRole('button', { name: /^Escribir 4/ }));

    await waitFor(() => {
      expect(empty.getAttribute('aria-label')).toMatch(/, 4$/);
    });
  });
});

describe('inside the shell', () => {
  it('wins through the shell when the last cell is filled', async () => {
    // Resuming a board one cell from done beats making 60 moves through the UI,
    // and it exercises the same path a real player takes to the end.
    const puzzle = puzzles.puzzles[0];
    const solution = parseGrid(puzzle?.s ?? '');
    const given = parseGrid(puzzle?.p ?? '');
    const lastEmpty = given.lastIndexOf(0);

    const values = solution.map((value, i) => (i === lastEmpty ? 0 : value));

    await storage.saveSession('sudoku', {
      schemaVersion: 1,
      gameId: 'sudoku',
      stateVersion: 1,
      difficulty: 1,
      state: JSON.stringify({
        v: 1,
        values: values.map((v) => (v === 0 ? '.' : String(v))).join(''),
        given: given.map((v) => (v === 0 ? '0' : '1')).join(''),
        notes: new Array(81).fill('0').join(','),
        solution: puzzle?.s ?? '',
      }),
      elapsedMs: 90_000,
      savedAt: Date.now(),
    });

    const { user } = renderAt('/game/sudoku');
    await screen.findByRole('grid', { name: 'Tablero de Sudoku' });

    // The clock came back with the board.
    await waitFor(() => {
      expect(screen.getByRole('timer').textContent).toBe('01:30');
    });

    const target = cellAt(Math.floor(lastEmpty / 9) + 1, (lastEmpty % 9) + 1);
    await user.click(target);
    await user.keyboard(String(solution[lastEmpty]));

    expect(await screen.findByRole('heading', { name: '¡Ganaste!' })).toBeInTheDocument();
    await waitFor(async () => {
      expect((await storage.getStats('sudoku')).completed).toBe(1);
    });
  });

  it('offers all five difficulties, because Sudoku declares all five', async () => {
    renderAt('/game/sudoku');

    const picker = await screen.findByRole('radiogroup', { name: 'Dificultad' });
    expect(within(picker).getAllByRole('radio')).toHaveLength(5);
  });
});

function firstEmptyCell(): HTMLElement {
  const grid = screen.getByRole('grid', { name: 'Tablero de Sudoku' });
  const empty = within(grid)
    .getAllByRole('gridcell')
    .find((cell) => cell.getAttribute('aria-label')?.includes('vacía'));
  if (!empty) throw new Error('no empty cell on the board');
  return empty;
}
