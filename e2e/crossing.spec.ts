import { expect, test, type Page } from '@playwright/test';

/**
 * Cruzar la calle en un navegador de verdad.
 *
 * Es el segundo juego con reloj, así que lo que se prueba acá es lo que jsdom
 * no puede: que el tráfico se mueva solo, que un toque avance, y que el gesto
 * del pulgar elija la dirección.
 *
 * En serie: varias de estas mediciones dependen del reloj, y cuatro navegadores
 * compitiendo por los mismos núcleos lo atrasan.
 */
test.describe.configure({ mode: 'serial' });

async function start(page: Page) {
  await page.goto('/arcade/crossing');
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await expect(page.getByRole('img', { name: /Cruzando/ })).toBeVisible();
}

const avance = (page: Page) =>
  page
    .getByRole('img', { name: /Cruzando/ })
    .getAttribute('aria-label')
    .then((label) => Number(/Cruzando: (\d+)/.exec(label ?? '')?.[1] ?? -1));

test('el tráfico se mueve solo, sin que nadie toque nada', async ({ page }) => {
  await start(page);

  const autos = page.locator('[class*="car"]');
  await expect(autos.first()).toBeVisible();

  /*
   * TODOS los autos y con espera, no el primero a los 700 ms.
   *
   * Cada carril tiene su propia velocidad (`every` en lanes.ts): uno lento
   * mueve sus autos una casilla cada cuatro ticks, o sea casi dos segundos en
   * el nivel 1. Mirar un auto cualquiera durante un rato corto no prueba que el
   * tráfico esté detenido, prueba que ese carril es lento.
   */
  const foto = () =>
    autos.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('style')).join('|'));

  const antes = await foto();
  await expect.poll(foto, { timeout: 8000, message: 'el tráfico quedó quieto' }).not.toBe(antes);
});

test('un toque avanza una fila', async ({ page }) => {
  await start(page);
  expect(await avance(page)).toBe(0);

  // Las primeras filas son siempre vereda: este paso no puede matar a nadie.
  await page.getByRole('img', { name: /Cruzando/ }).tap();
  await expect.poll(() => avance(page)).toBe(1);
});

test('el pulgar elige la dirección', async ({ page }) => {
  await start(page);
  await page.getByRole('img', { name: /Cruzando/ }).tap();
  await expect.poll(() => avance(page)).toBe(1);

  const board = page.getByRole('img', { name: /Cruzando/ });
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  // Deslizar hacia abajo retrocede, que es un movimiento propio de este juego.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx, y: cy }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: cx, y: cy + 60 }],
  });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  await expect.poll(() => avance(page)).toBe(0);
});

test('está en el estante Arcade y lleva a /arcade', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Arcade/ }).click();

  const card = page.locator('a[href="/arcade/crossing"]');
  await expect(card).toBeVisible();
  await expect(card.getByText('Cruzar la calle')).toBeVisible();
});
