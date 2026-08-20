import { expect, test, type Page } from '@playwright/test';

/**
 * Torre de bloques en un navegador de verdad.
 *
 * Es el tercer juego con reloj y el único sin azar: el bloque va y viene solo,
 * y toda la variación la pone el pulso. Lo que se prueba acá es lo que jsdom no
 * puede — que el vaivén corra sin que nadie toque nada, y que un toque en
 * cualquier parte del tablero suelte.
 *
 * En serie: varias mediciones dependen del reloj, y cuatro navegadores
 * compitiendo por los núcleos lo atrasan.
 */
test.describe.configure({ mode: 'serial' });

const board = (page: Page) => page.getByRole('button', { name: /Soltar/ });

async function start(page: Page) {
  await page.goto('/arcade/stack');
  await page.getByRole('button', { name: /Empezar partida|Continuar partida/ }).click();
  await expect(board(page)).toBeVisible();
}

const pisos = (page: Page) =>
  board(page)
    .getAttribute('aria-label')
    .then((label) => Number(/(\d+) de \d+ pisos/.exec(label ?? '')?.[1] ?? -1));

test('el bloque va y viene solo', async ({ page }) => {
  await start(page);

  const donde = () => page.locator('[class*="moving"]').getAttribute('style');
  const antes = await donde();

  await expect.poll(donde, { timeout: 5000, message: 'el bloque quedó quieto' }).not.toBe(antes);
});

test('un toque en cualquier parte del tablero suelta', async ({ page }) => {
  await start(page);
  expect(await pisos(page)).toBe(0);

  // El tablero entero es el botón: soltar no debería pedir puntería.
  await board(page).click({ position: { x: 12, y: 12 } });
  await expect.poll(() => pisos(page)).toBe(1);
});

/*
 * La partida entera, jugada apoyando solo cuando el bloque está alineado. Si el
 * recorte, la cámara o la condición de victoria estuvieran mal, esto no llegaría
 * nunca al trofeo.
 */
test('se puede ganar apoyando siempre justo', async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);

  for (let i = 0; i < 600; i += 1) {
    if (
      !(await board(page)
        .isVisible()
        .catch(() => false))
    )
      break;

    const alineado = await page.evaluate(() => {
      const mov = document.querySelector('[class*="moving"]');
      const piezas = Array.from(document.querySelectorAll('[class*="piece"]'));
      const cima = piezas[piezas.length - 1];
      if (!mov || !cima) return false;
      return Math.abs(mov.getBoundingClientRect().left - cima.getBoundingClientRect().left) < 10;
    });

    if (alineado) await board(page).click({ force: true });
    else await page.waitForTimeout(20);
  }

  await expect(page.getByRole('heading', { name: '¡Ganaste!' })).toBeVisible();
});

test('está en el estante Arcade y lleva a /arcade', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Arcade/ }).click();

  const card = page.locator('a[href="/arcade/stack"]');
  await expect(card).toBeVisible();
  await expect(card.getByText('Torre de bloques')).toBeVisible();
});
