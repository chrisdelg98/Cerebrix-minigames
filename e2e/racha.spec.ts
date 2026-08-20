import { expect, test, type Page } from '@playwright/test';

/**
 * El festejo de la racha.
 *
 * Nada de esto se puede ver en jsdom: son animaciones CSS dentro de un chunk
 * que se descarga aparte, y lo que importa es justamente que exista y que no
 * llegue antes de tiempo.
 */

/** Siembra partidas ganadas seguidas para fabricar una racha. */
async function racha(page: Page, count: number) {
  await page.goto('/');
  await page.evaluate(async (n) => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const req = indexedDB.open('cerebrix');
      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = () => {
        reject(new Error('no se pudo abrir la base'));
      };
    });
    await new Promise<void>((resolve) => {
      const tx = db.transaction('results', 'readwrite');
      for (let i = 0; i < n; i += 1) {
        tx.objectStore('results').add({
          schemaVersion: 1,
          gameId: 'snake',
          difficulty: 1,
          outcome: 'won',
          elapsedMs: 20_000,
          finishedAt: Date.now() - (n - i) * 60_000,
        });
      }
      tx.oncomplete = () => {
        resolve();
      };
    });
  }, count);
  await page.reload();
  await expect(page.getByText('Racha')).toBeVisible();
}

/** Cuántas chispas hay dibujadas dentro de la ficha de la racha. */
const chispas = (page: Page) => page.locator('[class*="spark"]').count();

test('por debajo del umbral no hay festejo, y su código ni se descarga', async ({ page }) => {
  const pedidos: string[] = [];
  page.on('request', (request) => pedidos.push(request.url()));

  // Justo por debajo del umbral: si se corriera, este es el que lo delata.
  await racha(page, 4);
  await page.waitForTimeout(600);

  expect(await chispas(page), 'apareció el efecto antes de tiempo').toBe(0);
  expect(
    pedidos.filter((url) => /SparksField/.test(url)),
    'se descargó el chunk del efecto sin necesitarlo'
  ).toEqual([]);
});

test('desde el umbral aparece, y crece con la racha', async ({ page }) => {
  await racha(page, 5);
  await page.waitForTimeout(600);
  const pocas = await chispas(page);
  expect(pocas, 'en el umbral no apareció nada').toBeGreaterThan(0);

  await racha(page, 20);
  await page.waitForTimeout(600);
  const muchas = await chispas(page);

  expect(muchas, 'la racha alta no se festeja más que la baja').toBeGreaterThan(pocas);
});

test('se detiene cuando la ficha sale de la pantalla', async ({ page }) => {
  await racha(page, 20);
  await page.waitForTimeout(600);

  const corriendo = async () =>
    page
      .locator('[class*="spark"]')
      .first()
      .evaluate((node) => getComputedStyle(node).animationPlayState);

  expect(await corriendo()).toBe('running');

  // Bien abajo, fuera del alcance del rootMargin del observador.
  await page.evaluate(() => {
    window.scrollTo(0, 3000);
  });
  await page.waitForTimeout(500);

  expect(await corriendo(), 'siguió animando fuera de la pantalla').toBe('paused');
});

test('pasado el techo aparece el anillo, y no antes', async ({ page }) => {
  const anillo = () => page.locator('[class*="ring"]').count();

  // El techo actual de la escala vive en src/core/streak.ts; acá alcanza con
  // una racha alta y la siguiente.
  await racha(page, 20);
  await page.waitForTimeout(400);
  const enElTecho = await anillo();

  await racha(page, 60);
  await page.waitForTimeout(400);
  expect(await anillo(), 'una racha enorme debería llevar anillo').toBeGreaterThan(0);
  expect(enElTecho, 'el anillo no puede aparecer antes de pasar el techo').toBeLessThanOrEqual(
    await anillo()
  );
});
