import { expect, test, type Page } from '@playwright/test';

/** Lee el tablero desde las etiquetas: cada casilla dice su fila, columna y número. */
async function leerTablero(page: Page) {
  return page.evaluate(() => {
    const celdas = Array.from(document.querySelectorAll('[role="gridcell"]'));
    return celdas.map((el, i) => {
      const found = /número (\d+)/.exec(el.getAttribute('aria-label') ?? '');
      return { i, n: found === null ? 0 : Number(found[1]) };
    });
  });
}

test.describe('Shikaku', () => {
  test('arrastrar dibuja el rectángulo y avisa antes de soltar', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 820 });
    await page.goto('/game/shikaku');
    await page.getByRole('button', { name: /Empezar partida/ }).click();

    const celdas = page.getByRole('gridcell');
    // Fácil es 5×5. Ver CONFIGS en shikakuEngine.ts.
    await expect(celdas).toHaveCount(25);

    const tablero = await leerTablero(page);
    const size = 5;
    /*
     * Cualquier rectángulo VÁLIDO: del área que pide su número y sin agarrar
     * ningún otro. Buscar solo tiras horizontales desde la propia casilla no
     * alcanzaba — a 5×5 el tablero es denso y casi siempre cae un segundo
     * número dentro.
     */
    const numero = (cell: number) => tablero[cell]?.n ?? 0;
    let pista: { desde: number; hasta: number; n: number } | undefined;

    for (const { i, n } of tablero) {
      if (n === 0 || pista !== undefined) continue;
      const cx = i % size;
      const cy = Math.floor(i / size);

      for (let w = 1; w <= n && pista === undefined; w += 1) {
        if (n % w !== 0) continue;
        const h = n / w;
        for (let x = Math.max(0, cx - w + 1); x <= cx && x + w <= size; x += 1) {
          for (let y = Math.max(0, cy - h + 1); y <= cy && y + h <= size; y += 1) {
            let cuantos = 0;
            for (let dy = 0; dy < h; dy += 1) {
              for (let dx = 0; dx < w; dx += 1) {
                if (numero((y + dy) * size + x + dx) > 0) cuantos += 1;
              }
            }
            if (cuantos === 1) {
              pista = { desde: y * size + x, hasta: (y + h - 1) * size + x + w - 1, n };
              break;
            }
          }
          if (pista !== undefined) break;
        }
      }
    }

    expect(pista, 'no había ningún rectángulo válido en el tablero').toBeDefined();
    if (pista === undefined) return;

    const desde = await celdas.nth(pista.desde).boundingBox();
    const hasta = await celdas.nth(pista.hasta).boundingBox();
    expect(desde).not.toBeNull();
    expect(hasta).not.toBeNull();
    if (desde === null || hasta === null) return;

    await page.mouse.move(desde.x + desde.width / 2, desde.y + desde.height / 2);
    await page.mouse.down();
    await page.mouse.move(hasta.x + hasta.width / 2, hasta.y + hasta.height / 2, { steps: 5 });

    /* La mitad de la sensación es saber si cierra ANTES de soltar: la vista
       previa se pone en `ok` cuando el área coincide con el número. */
    const previa = page.locator('[class*="ShikakuView"][class*="preview"]');
    await expect(previa).toHaveAttribute('data-state', 'ok');

    await page.mouse.up();
    await expect(page.locator('[class*="ShikakuView"][class*="rect"]')).toHaveCount(1);
    await expect(page.getByText(`${String(pista.n)}/25`)).toBeVisible();
  });

  test('dibujar encima reemplaza, y tocar saca', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 820 });
    await page.goto('/game/shikaku');
    await page.getByRole('button', { name: /Empezar partida/ }).click();

    const celdas = page.getByRole('gridcell');
    const tablero = await leerTablero(page);
    const unos = tablero.filter(({ n }) => n === 1);
    expect(unos.length, 'este tablero no trajo ningún 1').toBeGreaterThan(0);
    const uno = unos[0];
    if (uno === undefined) return;

    // Un 1 es un rectángulo de una casilla: se pone con un toque.
    await celdas.nth(uno.i).click();
    const puestos = page.locator('[class*="ShikakuView"][class*="rect"]');
    await expect(puestos).toHaveCount(1);

    // Y el mismo toque encima lo saca.
    await celdas.nth(uno.i).click();
    await expect(puestos).toHaveCount(0);
  });

  test('el tablero entra sin desbordar en un teléfono', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/game/shikaku');
    await page.getByRole('button', { name: /Empezar partida/ }).click();
    await expect(page.getByRole('grid', { name: 'Tablero de Shikaku' })).toBeVisible();

    const desborda = await page.evaluate(() => document.documentElement.scrollWidth > 360);
    expect(desborda, 'el tablero desborda a lo ancho').toBe(false);
  });

  /*
   * El arrastre CON EL DEDO, que es distinto del arrastre con ratón.
   *
   * Al tocar, el navegador le da la captura del puntero al elemento donde empezó
   * el toque: todo lo que viene después va a esa casilla y `pointerenter` no se
   * dispara en ninguna otra, así que el rectángulo se queda en la primera. Con
   * ratón no pasa — por eso las pruebas anteriores no lo veían y el juego llegó
   * roto al teléfono.
   */
  test('se arrastra con el dedo, no solo con el ratón', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto('/game/shikaku');
    await page.getByRole('button', { name: /Empezar partida/ }).click();
    await page.waitForTimeout(400);

    const tablero = await page.evaluate(() => {
      const celdas = Array.from(document.querySelectorAll('[role="gridcell"]'));
      return celdas.map((el, i) => {
        const m = /número (\d+)/.exec(el.getAttribute('aria-label') ?? '');
        const r = el.getBoundingClientRect();
        return { i, n: m === null ? 0 : Number(m[1]), x: r.x + r.width / 2, y: r.y + r.height / 2 };
      });
    });
    const size = Math.round(Math.sqrt(tablero.length));
    const numero = (c: number) => tablero[c]?.n ?? 0;

    // Un rectángulo válido de más de una casilla, para que el arrastre importe.
    let objetivo: { a: number; b: number } | undefined;
    for (const { i, n } of tablero) {
      if (n < 2 || objetivo !== undefined) continue;
      for (let w = 1; w <= n && objetivo === undefined; w += 1) {
        if (n % w !== 0) continue;
        const h = n / w;
        const cx = i % size;
        const cy = Math.floor(i / size);
        for (let x = Math.max(0, cx - w + 1); x <= cx && x + w <= size; x += 1) {
          for (let y = Math.max(0, cy - h + 1); y <= cy && y + h <= size; y += 1) {
            let cuantos = 0;
            for (let dy = 0; dy < h; dy += 1) {
              for (let dx = 0; dx < w; dx += 1)
                if (numero((y + dy) * size + x + dx) > 0) cuantos += 1;
            }
            if (cuantos === 1) {
              objetivo = { a: y * size + x, b: (y + h - 1) * size + x + w - 1 };
              break;
            }
          }
          if (objetivo !== undefined) break;
        }
      }
    }
    expect(objetivo).toBeDefined();
    if (objetivo === undefined) return;

    const desde = tablero[objetivo.a];
    const hasta = tablero[objetivo.b];
    if (desde === undefined || hasta === undefined) return;

    // Toque real, no ratón: con el dedo es donde la captura implícita rompía todo.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: desde.x, y: desde.y }],
    });
    for (let k = 1; k <= 8; k += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          {
            x: desde.x + ((hasta.x - desde.x) * k) / 8,
            y: desde.y + ((hasta.y - desde.y) * k) / 8,
          },
        ],
      });
    }

    /* Si la captura implícita no se soltó, el arrastre se queda en la primera
       casilla y la vista previa nunca llega a `ok`. */
    const previa = await page.evaluate(() => {
      const el = document.querySelector('[class*="ShikakuView"][class*="preview"]');
      return el === null ? null : el.getAttribute('data-state');
    });
    expect(previa, 'el arrastre no salió de la primera casilla').toBe('ok');

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(400);

    await expect(page.locator('[class*="ShikakuView"][class*="rect"]')).toHaveCount(1);
  });
});
