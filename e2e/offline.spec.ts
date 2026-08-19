import { expect, test, type Page } from '@playwright/test';

/**
 * La promesa central del proyecto, comprobada de verdad.
 *
 * El plan lo dice sin rodeos: "que sirva en el subte, sin señal y con una
 * mano", y "offline completo — no hay backend, no hay excusa". Hasta ahora eso
 * era una configuración de Workbox que nadie había ejercido: el precache se
 * declara en vite.config.ts, pero declararlo y que funcione son cosas
 * distintas, y jsdom no tiene service workers.
 *
 * Corre en serie porque apagar la red es un estado del navegador, no del test.
 */
test.describe.configure({ mode: 'serial' });

/** Espera a que el service worker esté activo y haya terminado de precachear. */
async function serviceWorkerReady(page: Page) {
  await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.state === 'activated';
    },
    undefined,
    { timeout: 30_000 }
  );
}

test('la portada abre sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);
  // El precache se escribe después de activar; sin esta pausa la primera
  // navegación offline puede llegar antes que los archivos.
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Cerebrix' })).toBeVisible();
  await expect(page.locator('a[href^="/game/"]').first()).toBeVisible();
});

test('un juego que nunca se abrió se puede jugar sin conexión', async ({ page, context }) => {
  await page.goto('/');
  await serviceWorkerReady(page);
  await page.waitForTimeout(1500);

  await context.setOffline(true);

  /*
   * Apagón, deliberadamente: en esta sesión nunca se visitó, así que su chunk
   * solo puede venir del precache. Si el precache dejara afuera los juegos, un
   * viaje en subte serviría para mirar la portada y nada más.
   */
  await page.goto('/game/apagon');
  await expect(page.getByText('Hay una versión nueva')).toBeHidden();

  await page.getByRole('button', { name: /Empezar partida|Continuar partida/ }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();

  const board = page.getByRole('grid', { name: 'Tablero de Apagón' });
  const before = await board
    .getByRole('gridcell')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));

  await board.getByRole('gridcell').nth(4).click();

  const after = await board
    .getByRole('gridcell')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('aria-label')));

  expect(after, 'el tablero no respondió sin conexión').not.toEqual(before);
});

test('una partida sin conexión se guarda y vuelve', async ({ page, context }) => {
  await page.goto('/game/sudoku');
  await serviceWorkerReady(page);
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.reload();

  await page.getByRole('button', { name: /Empezar partida|Continuar partida/ }).click();
  await expect(page.getByRole('button', { name: 'Nueva partida' })).toBeVisible();

  // IndexedDB es local, así que el guardado no debería depender de la red.
  await page.waitForTimeout(600);
  await page.reload();

  await expect(
    page.getByRole('button', { name: /Continuar partida|Empezar partida/ })
  ).toBeVisible();
});
