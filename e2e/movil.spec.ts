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

/*
 * Las cifras de la portada según el ancho.
 *
 * Las cuatro fichas se comían casi un tercio de la primera pantalla de un
 * teléfono, y esa pantalla tiene un trabajo: mostrar juegos. En móvil queda la
 * racha sola a lo ancho y el bloque entero lleva al historial, que es donde
 * están las cuatro. En una pantalla ancha no sobra espacio, así que se quedan.
 *
 * Es un corte por media query, así que solo se puede comprobar acá.
 */
test('la portada muestra una sola cifra en el teléfono y las cuatro en pantalla ancha', async ({
  page,
}) => {
  // Una partida cualquiera, para que el bloque exista.
  await page.goto('/arcade/snake');
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await expect(page.getByRole('heading', { name: 'Se terminó' })).toBeVisible({ timeout: 15_000 });

  /*
   * VISIBLES, no presentes. Las cuatro fichas se renderizan siempre y el CSS
   * decide cuáles se muestran, así que `count()` —que cuenta nodos del DOM—
   * devolvería cuatro en los dos anchos y el test no probaría nada.
   */
  const visibles = async () => {
    const bloque = page.getByRole('link', { name: 'Ver mi historial completo' });
    await expect(bloque).toBeVisible();
    return bloque
      .getByText(/^(Partidas|Completadas|Éxito|Racha)$/)
      .evaluateAll((nodes) => nodes.filter((node) => node.checkVisibility()).length);
  };

  await page.setViewportSize(NARROW);
  await page.goto('/');
  expect(await visibles(), 'el teléfono debería mostrar solo la racha').toBe(1);
  await expect(page.getByRole('link', { name: 'Ver mi historial completo' })).toHaveAttribute(
    'href',
    '/historial'
  );

  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto('/');
  expect(await visibles(), 'en pantalla ancha deberían estar las cuatro').toBe(4);

  // Y las cuatro tienen que estar siempre en el historial, en los dos anchos.
  for (const size of [NARROW, { width: 900, height: 900 }]) {
    await page.setViewportSize(size);
    await page.goto('/historial');
    const totales = page.getByRole('region', { name: 'Tus estadísticas' });
    await expect(totales).toBeVisible();
    const cifras = await totales
      .getByText(/^(Partidas|Completadas|Éxito|Racha)$/)
      .evaluateAll((nodes) => nodes.filter((node) => node.checkVisibility()).length);
    expect(cifras).toBe(4);
  }
});
