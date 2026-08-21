import { expect, test } from '@playwright/test';

/**
 * El primer juego de dos personas, que es lo que estrena el contrato: modos,
 * empate y un ganador con nombre. Se prueba acá y no en jsdom porque lo que
 * puede fallar es de navegador — que el selector de modo se vea y se toque, y
 * que al elegir "dos jugadores" el nivel desaparezca de verdad.
 */
test.describe('Tres en línea', () => {
  test('ofrece los dos modos y esconde el nivel cuando no cuenta', async ({ page }) => {
    await page.goto('/game/tic-tac-toe');

    const maquina = page.getByRole('button', { name: 'Contra la máquina' });
    const dos = page.getByRole('button', { name: 'Dos jugadores' });
    await expect(maquina).toBeVisible();
    await expect(dos).toBeVisible();

    // Contra la máquina el nivel manda, así que el selector está.
    await expect(
      page.getByRole('button', { name: /Nivel|Dificultad|Fácil|Normal/ }).first()
    ).toBeVisible();

    await dos.click();
    await expect(page.getByText(/no cuenta para tu historial/)).toBeVisible();
  });

  test('se juega: la ficha aparece donde se toca', async ({ page }) => {
    await page.goto('/game/tic-tac-toe');
    await page.getByRole('button', { name: 'Dos jugadores' }).click();
    await page.getByRole('button', { name: /Empezar partida/ }).click();

    const tablero = page.getByRole('grid', { name: 'Tablero de Tres en línea' });
    await expect(tablero).toBeVisible();

    // Las casillas son `gridcell`, no `button`: el tablero es una grilla.
    await tablero.getByRole('gridcell', { name: 'centro, vacía', exact: true }).click();

    // Entre dos personas nadie contesta: hay exactamente una ficha puesta.
    await expect(tablero.getByRole('gridcell', { name: /, equis$/ })).toHaveCount(1);
    await expect(tablero.getByRole('gridcell', { name: /, círculo$/ })).toHaveCount(0);
    await expect(page.getByText('Juegan las O')).toBeVisible();
  });
});
