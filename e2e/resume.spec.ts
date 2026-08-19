import { expect, test } from '@playwright/test';

/**
 * Jugar, cerrar y volver. Es el ítem de "E2E" de la Fase 7 del plan.
 *
 * El autoguardado tiene tests unitarios, pero acá pasa por donde pasa de
 * verdad: IndexedDB en un navegador real y una recarga de página completa, no
 * un componente remontado a mano.
 */

test('una partida empezada sobrevive a recargar la página', async ({ page }) => {
  await page.goto('/game/apagon');
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();

  const board = page.getByRole('grid', { name: 'Tablero de Apagón' });
  await board.getByRole('gridcell').nth(4).click();

  const after = await board
    .getByRole('gridcell')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));

  // El autoguardado escribe con cada jugada; se le da margen antes de recargar.
  await expect(page.getByText(/Toques/i)).toBeVisible();
  await page.waitForTimeout(500);

  await page.reload();

  const resume = page.getByRole('button', { name: /Continuar partida|Empezar partida/ });
  await expect(resume).toBeVisible();
  await expect(resume, 'no ofreció continuar la partida guardada').toHaveText(/Continuar/);
  await resume.click();

  const restored = await board
    .getByRole('gridcell')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));

  expect(restored, 'el tablero no volvió como estaba').toEqual(after);
});

test('la portada ofrece continuar el juego que quedó a medias', async ({ page }) => {
  await page.goto('/game/apagon');
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await page.getByRole('grid', { name: 'Tablero de Apagón' }).getByRole('gridcell').nth(0).click();
  await page.waitForTimeout(500);

  await page.goto('/');

  const card = page.locator('a[href="/game/apagon"]');
  await expect(card.getByText('Continuar')).toBeVisible();
});
