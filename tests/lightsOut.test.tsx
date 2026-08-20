import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '@core/router';
import { StorageContext } from '@core/storageContext';
import { LocalStorageDriver } from '@storage/localStorageDriver';

/** Lights Out dentro del shell. El motor se prueba aparte, sin DOM. */

let storage: LocalStorageDriver;

function renderGame() {
  const router = createMemoryRouter(routes, { initialEntries: ['/game/lights-out'] });
  render(
    <StorageContext.Provider value={storage}>
      <RouterProvider router={router} />
    </StorageContext.Provider>
  );
  return userEvent.setup();
}

async function startGame(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(
    await screen.findByRole('button', { name: /Empezar partida|Continuar partida/ })
  );
  return screen.getByRole('grid', { name: 'Tablero de Lights Out' });
}

const cells = (board: HTMLElement) => within(board).getAllByRole('gridcell');
const lit = (board: HTMLElement) => cells(board).filter((c) => /encendida/.test(c.ariaLabel ?? ''));

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storage = new LocalStorageDriver();
});

describe('Lights Out dentro del shell', () => {
  it('carga desde el registro con luces prendidas para apagar', async () => {
    const user = renderGame();
    const board = await startGame(user);

    // Nivel 1: 3×3.
    expect(cells(board)).toHaveLength(9);
    expect(lit(board).length).toBeGreaterThan(0);
  });

  it('un toque cambia la casilla y sus vecinas, no solo una', async () => {
    const user = renderGame();
    const board = await startGame(user);

    const before = cells(board).map((c) => c.ariaLabel);
    // El centro de un 3×3 toca cinco casillas.
    await user.click(cells(board)[4] as HTMLElement);
    const after = cells(board).map((c) => c.ariaLabel);

    const changed = before.filter((label, i) => label !== after[i]);
    expect(changed).toHaveLength(5);
  });

  /*
   * La partida entera, jugada con la pista del propio motor. Si el solucionador
   * o el shell se equivocaran, esto no llegaría nunca a la pantalla de victoria.
   */
  it('se puede ganar siguiendo las pistas', async () => {
    const user = renderGame();
    const board = await startGame(user);

    for (let step = 0; step < 30 && lit(board).length > 0; step += 1) {
      await user.click(screen.getByRole('button', { name: /Pista/i }));

      const target = cells(board).find((cell) => cell.dataset.state === 'hint');
      expect(target, `sin pista en el paso ${String(step)}`).toBeDefined();
      await user.click(target as HTMLElement);
    }

    expect(lit(board)).toHaveLength(0);
    expect(await screen.findByText('¡Ganaste!')).toBeInTheDocument();
  });
});
