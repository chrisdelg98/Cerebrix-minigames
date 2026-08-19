import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '@core/router';
import { StorageContext } from '@core/storageContext';
import { LocalStorageDriver } from '@storage/localStorageDriver';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

/**
 * 2048 corriendo dentro del shell, que es el único camino que importa: registro
 * → carga perezosa → pantalla de inicio → vista → motor. El motor en sí ya se
 * prueba aparte, sin DOM, en game2048Engine.test.ts.
 */

let storage: LocalStorageDriver;

function renderGame() {
  const router = createMemoryRouter(routes, { initialEntries: ['/game/2048'] });
  render(
    <StorageContext.Provider value={storage}>
      <RouterProvider router={router} />
    </StorageContext.Provider>
  );
  return userEvent.setup();
}

async function startGame(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(
    await screen.findByRole(
      'button',
      { name: /Empezar partida|Continuar partida/ },
      { timeout: 5000 }
    )
  );
  return screen.getByRole('grid', { name: 'Tablero de 2048' });
}

/** El tablero como texto, para comparar un antes y un después. */
const snapshot = (board: HTMLElement) =>
  within(board)
    .getAllByRole('gridcell')
    .map((cell) => cell.textContent)
    .join('|');

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  storage = new LocalStorageDriver();
});

describe('2048 dentro del shell', () => {
  it('carga desde el registro sin que /core sepa qué es', async () => {
    const user = renderGame();
    const board = await startGame(user);

    expect(within(board).getAllByRole('gridcell')).toHaveLength(16);
    // El original arranca con dos fichas: con una, la primera jugada sería gratis.
    const filled = within(board)
      .getAllByRole('gridcell')
      .filter((cell) => cell.textContent !== '');
    expect(filled).toHaveLength(2);
    expect(filled.every((cell) => ['2', '4'].includes(cell.textContent ?? ''))).toBe(true);
  });

  /*
   * Los puntos y la meta coincidían visualmente y se leían como lo mismo.
   * «Puntos 256, meta 256» con la mejor ficha en 32 parecía una partida ganada
   * que el juego no daba por ganada. Son magnitudes distintas y se muestran
   * distinto: los puntos sueltos, la meta contada en fichas.
   */
  it('no confunde los puntos con la ficha que hay que alcanzar', async () => {
    const user = renderGame();
    await startGame(user);

    // Cada magnitud lleva su propia etiqueta, así que un número no puede
    // leerse como el otro aunque coincidan.
    const puntos = screen.getByText('Puntos').parentElement;
    const ficha = screen.getByText('Ficha').parentElement;

    expect(puntos).not.toBe(ficha);
    expect(puntos).toHaveTextContent(/^Puntos0$/);
    // Nivel 1: se empieza con un 2 o un 4 y hay que llegar al 128.
    expect(ficha).toHaveTextContent(/^Ficha[24]de128$/);
  });

  it('mueve el tablero con las flechas', async () => {
    const user = renderGame();
    const board = await startGame(user);
    const before = snapshot(board);

    // Con dos fichas al azar hay al menos un lado que mueve algo, pero no se
    // sabe cuál: se prueban los cuatro y alcanza con que uno responda.
    for (const key of ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']) {
      fireEvent.keyDown(window, { key });
      if (snapshot(board) !== before) return;
    }

    throw new Error('ninguna flecha movió el tablero');
  });

  it('mueve el tablero deslizando el dedo', async () => {
    const user = renderGame();
    const board = await startGame(user);
    const before = snapshot(board);

    // El gesto lo escucha el contenedor del tablero, no la página.
    const surface = board.parentElement?.parentElement ?? board;

    const swipes = [
      { x: 200, y: 100 },
      { x: 100, y: 200 },
      { x: 0, y: 100 },
      { x: 100, y: 0 },
    ];
    for (const end of swipes) {
      fireEvent.pointerDown(surface, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(surface, { clientX: end.x, clientY: end.y });
      if (snapshot(board) !== before) return;
    }

    throw new Error('ningún deslizamiento movió el tablero');
  });

  it('ignora un roce que no llega a ser deslizamiento', async () => {
    const user = renderGame();
    const board = await startGame(user);
    const before = snapshot(board);
    const surface = board.parentElement?.parentElement ?? board;

    // Ocho píxeles es un toque tembloroso, no una intención de mover.
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(surface, { clientX: 108, clientY: 100 });

    expect(snapshot(board)).toBe(before);
  });
});
