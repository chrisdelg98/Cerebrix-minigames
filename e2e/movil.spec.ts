import { expect, test, type Page } from '@playwright/test';

/**
 * Que entre en un teléfono chico. Todos, y los que vengan.
 *
 * El sistema de diseño dice "se diseña a 360px y se expande" (§1), pero eso era
 * una intención sin nadie que la verificara: un tablero que se pasa unos
 * píxeles no rompe ningún test y se descubre con el teléfono en la mano.
 *
 * 360×640 es el piso que el proyecto declara soportar.
 */

const NARROW = { width: 360, height: 640 };

/** Cuánto se pasa la página de su propio ancho. Cero es lo correcto. */
async function overflow(page: Page) {
  return page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });
}

test('ninguna pantalla se desborda a lo ancho en un teléfono de 360px', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize(NARROW);

  await page.goto('/');
  expect(await overflow(page), 'la portada se desborda').toBeLessThanOrEqual(0);

  const hrefs = await page
    .locator('a[href^="/game/"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));

  expect(hrefs.length).toBeGreaterThan(0);

  for (const href of hrefs) {
    await page.goto(href);

    // La pantalla de reglas, que es la más larga de texto.
    const start = page.getByRole('button', { name: /Empezar partida|Continuar partida/ });
    await expect(start).toBeVisible();
    expect(await overflow(page), `${href}: las reglas se desbordan`).toBeLessThanOrEqual(0);

    // Y el tablero, que es lo que de verdad puede no entrar.
    await start.click();
    await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();
    expect(await overflow(page), `${href}: el tablero se desborda`).toBeLessThanOrEqual(0);
  }

  await page.goto('/historial');
  expect(await overflow(page), 'el historial se desborda').toBeLessThanOrEqual(0);
});
