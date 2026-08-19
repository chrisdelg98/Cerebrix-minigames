import { expect, test } from '@playwright/test';

/**
 * Cada juego abre de verdad, por HTTP y con chunks con hash.
 *
 * Es la red que faltaba cuando un usuario de iOS se encontró con
 * "'text/html' is not a valid JavaScript MIME type": un chunk que no resuelve
 * es invisible para jsdom, que importa módulos del sistema de archivos.
 *
 * La lista de juegos sale de la portada y no de una constante acá: registrar un
 * juego nuevo lo mete en este test solo, que es la misma promesa que hace el
 * registro con la grilla.
 */

test('la portada lista los juegos y ninguno rompe al abrirse', async ({ page }) => {
  // Recorre los diez juegos de a uno: es largo por lo que hace, no por lentitud.
  test.setTimeout(120_000);

  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Cerebrix' })).toBeVisible();

  const links = page.locator('a[href^="/game/"]');
  const hrefs = await links.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLAnchorElement).getAttribute('href') ?? '')
  );

  expect(hrefs.length, 'la portada no ofreció ningún juego').toBeGreaterThan(0);

  for (const href of hrefs) {
    await page.goto(href);

    // La pantalla de error del router no debería aparecer nunca acá.
    await expect(page.getByText('Algo se rompió')).toBeHidden();
    await expect(page.getByText('Hay una versión nueva')).toBeHidden();

    const start = page.getByRole('button', { name: /Empezar partida|Continuar partida/ });
    await expect(start, `${href} no llegó a la pantalla de inicio`).toBeVisible();
    await start.click();

    // El pie del shell aparece con el tablero, sea cual sea el juego.
    await expect(
      page.getByRole('button', { name: 'Nueva partida' }),
      `${href} no llegó a mostrar el tablero`
    ).toBeVisible();
  }

  expect(errors, `errores de JavaScript: ${errors.join(' · ')}`).toEqual([]);
});

test('el historial abre, que es donde falló en iOS', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await page.getByRole('link', { name: /Mi historial/ }).click();

  await expect(page.getByText('Algo se rompió')).toBeHidden();
  await expect(page).toHaveURL(/\/historial$/);
  expect(errors).toEqual([]);
});

test('una ruta que no existe muestra la pantalla propia, no la del router', async ({ page }) => {
  await page.goto('/game/no-existe');

  await expect(page.getByRole('heading', { name: 'Por acá no hay nada' })).toBeVisible();
  // Lo que NO puede pasar: que la pantalla de desarrollo del router se le
  // muestre a un jugador, que es exactamente lo que vio el usuario de iOS.
  await expect(page.getByText(/Hey developer|Unexpected Application Error/)).toBeHidden();
});
