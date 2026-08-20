import { expect, test, type Page } from '@playwright/test';

/** Siembra resultados repartidos entre dos juegos. */
async function sembrar(page: Page, count: number) {
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
          gameId: i % 3 === 0 ? 'trace' : 'snake',
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
}

const filas = (page: Page) => page.locator('main li, #main li').count();

test('el historial mide lo mismo que la portada', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await sembrar(page, 4);

  const ancho = async (path: string) => {
    await page.goto(path);
    return page.locator('#main').evaluate((node) => node.getBoundingClientRect().width);
  };

  const historial = await ancho('/historial');
  const portada = await ancho('/');

  /*
   * Con tolerancia y no con igualdad exacta: si una pantalla tiene barra de
   * desplazamiento y la otra no, los anchos difieren en una fracción de píxel.
   * Lo que este test cuida son los 140 de diferencia que había cuando el
   * historial medía 720 y la portada 860.
   */
  expect(
    Math.abs(historial - portada),
    `historial ${String(historial)} vs portada ${String(portada)}`
  ).toBeLessThan(2);
});

test('filtra por juego con el mismo control que la portada', async ({ page }) => {
  await sembrar(page, 12);
  await page.goto('/historial');

  // El mismo `radiogroup` que filtra los juegos en la portada, no un control
  // propio con otro aspecto.
  const filtros = page.getByRole('radiogroup', { name: 'Filtrar por juego' });
  await expect(filtros).toBeVisible();

  const todos = await filas(page);
  await filtros.getByRole('radio', { name: /Trazo/ }).click();
  const soloTrazo = await filas(page);

  expect(soloTrazo).toBeLessThan(todos);
  expect(soloTrazo).toBeGreaterThan(0);
});

test('muestra de a diez y carga el resto a pedido', async ({ page }) => {
  await sembrar(page, 26);
  await page.goto('/historial');

  const verMas = page.getByRole('button', { name: /Ver más/ });
  await expect(verMas, 'con 26 resultados debería ofrecer cargar más').toBeVisible();

  const primeras = await filas(page);
  await verMas.click();
  expect(await filas(page), 'no cargó una tanda nueva').toBeGreaterThan(primeras);
});
