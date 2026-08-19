import { expect, test, type Page } from '@playwright/test';

/**
 * Los gestos con un dedo de verdad.
 *
 * Esta es LA franja que jsdom no puede cubrir. Un toque captura implícitamente
 * el puntero en el elemento donde cayó el dedo, y ese mecanismo simplemente no
 * existe en jsdom: los tests unitarios pueden verificar que se suelta la
 * captura, pero no que arrastrar funcione.
 *
 * Por eso el bug de Trazo — empezar el trazo sobre el número no funcionaba,
 * había que apuntar al borde de la casilla — llegó a producción y lo encontró
 * Chris jugando. El mismo bug estaba en Nonograma sin que nadie lo reportara.
 */

async function start(page: Page, game: string) {
  await page.goto(`/game/${game}`);
  await page.getByRole('button', { name: /Empezar partida|Continuar partida/ }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();
}

/** Arrastra el dedo de un punto a otro, con pasos intermedios reales. */
async function dragFinger(page: Page, from: [number, number], to: [number, number]) {
  const client = await page.context().newCDPSession(page);

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: from[0], y: from[1] }],
  });
  for (let step = 1; step <= 8; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: from[0] + ((to[0] - from[0]) * step) / 8,
          y: from[1] + ((to[1] - from[1]) * step) / 8,
        },
      ],
    });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('Trazo: el trazo empieza tocando el número, no solo el borde', async ({ page }) => {
  await start(page, 'trazo');

  // La casilla con el 1 es la única desde la que se puede empezar.
  const one = page.getByRole('gridcell', { name: /número 1$/ });
  await expect(one).toBeVisible();

  const box = await one.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  // El centro exacto: ahí está el disco del número, que era el punto muerto.
  const centre: [number, number] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.touchscreen.tap(centre[0], centre[1]);

  await expect(
    page.getByRole('gridcell', { name: /número 1, paso 1 del trazo/ }),
    'tocar el número no arrancó el trazo'
  ).toBeVisible();
});

test('Trazo: arrastrar desde el número extiende el trazo a la casilla vecina', async ({ page }) => {
  await start(page, 'trazo');

  const one = page.getByRole('gridcell', { name: /número 1$/ });
  const box = await one.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const centre: [number, number] = [box.x + box.width / 2, box.y + box.height / 2];
  // Un ancho de casilla hacia un lado u otro: alguno de los dos es vecino válido.
  for (const dx of [box.width, -box.width, 0, 0]) {
    const dy = dx === 0 ? box.height : 0;
    await dragFinger(page, centre, [centre[0] + dx, centre[1] + dy]);

    const steps = await page.getByRole('gridcell', { name: /paso \d+ del trazo/ }).count();
    if (steps >= 2) return;
  }

  throw new Error('arrastrar desde el número nunca extendió el trazo');
});

test('Nonograma: arrastrar pinta una hilera, no una sola casilla', async ({ page }) => {
  await start(page, 'nonogram');

  const cells = page.getByRole('gridcell');
  const first = await cells.first().boundingBox();
  expect(first).not.toBeNull();
  if (!first) return;

  const from: [number, number] = [first.x + first.width / 2, first.y + first.height / 2];
  await dragFinger(page, from, [from[0] + first.width * 2.5, from[1]]);

  // Sin importar en qué modo esté el tablero: lo que cuenta es que el arrastre
  // haya tocado más de una casilla, no cuál marca dejó.
  const marked = await page
    .getByRole('gridcell')
    .evaluateAll(
      (cells) => cells.filter((cell) => !/vacía/.test(cell.getAttribute('aria-label') ?? '')).length
    );
  expect(marked, 'el arrastre no marcó más de una casilla').toBeGreaterThan(1);
});
