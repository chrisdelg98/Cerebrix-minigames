import { expect, test } from '@playwright/test';

/**
 * El segundo juego de dos personas, y la prueba de que el contrato aguantó: si
 * Conecta 4 entra sin tocar /core, los modos y el ganador con nombre quedaron
 * bien resueltos con Tres en línea.
 */
test.describe('Conecta 4', () => {
  test('la ficha cae al fondo de la columna que se toca', async ({ page }) => {
    await page.goto('/game/connect-four');
    await page.getByRole('button', { name: 'Dos jugadores' }).click();
    await page.getByRole('button', { name: /Empezar partida/ }).click();

    const tablero = page.getByRole('group', { name: 'Tablero de Conecta 4' });
    await expect(tablero).toBeVisible();

    // La columna entera es el objetivo, que es lo que la hace cómoda en móvil.
    const columna = page.getByRole('button', { name: /^Columna 4,/ });
    await expect(columna).toBeVisible();
    /* Seis casillas redondas de alto. Si se aplastan —pasó— el tablero se ve
       mal y el objetivo táctil se encoge; con 240px hay margen de sobra. */
    const caja = await columna.boundingBox();
    expect(caja?.height ?? 0, 'las casillas se aplastaron').toBeGreaterThan(240);
    expect(caja?.height ?? 0).toBeGreaterThan((caja?.width ?? 0) * 4);

    await columna.click();
    await expect(page.getByText('Juegan las amarillas')).toBeVisible();
  });

  /*
   * Los agujeros tienen que verse contra el tablero, y las fichas entre sí.
   *
   * Es la tercera vez en el proyecto que dos tokens distintos resultan ser el
   * mismo color —pasó en Cruzar la calle y en Torre de bloques—, y acá dejó el
   * tablero como un rectángulo blanco vacío en los dos temas. El nombre de un
   * token no dice de qué color es; esto lo comprueba mirándolo.
   */
  test('el tablero se ve: agujeros contra marco y fichas distintas', async ({ page }) => {
    await page.goto('/game/connect-four');
    await page.getByRole('button', { name: /Empezar partida/ }).click();
    await page.getByRole('button', { name: /^Columna 4,/ }).click();

    const c = await page.evaluate(() => {
      const bg = (sel: string) => {
        const el = document.querySelector(sel);
        return el === null ? 'n/a' : getComputedStyle(el).backgroundColor;
      };
      return {
        tablero: bg('[class*="ConnectFourView"][class*="board"]'),
        hueco: bg('[class*="ConnectFourView"][class*="slot"]'),
        roja: bg('[class*="disc"][data-disc="red"]'),
        amarilla: bg('[class*="disc"][data-disc="yellow"]'),
      };
    });

    expect(c.hueco, 'los agujeros no se distinguen del tablero').not.toBe(c.tablero);
    expect(c.roja, 'las dos fichas son del mismo color').not.toBe(c.amarilla);
    expect(c.roja).not.toBe('n/a');
    expect(c.amarilla).not.toBe('n/a');
  });

  test('el tablero entra sin desbordar en un teléfono', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/game/connect-four');
    await page.getByRole('button', { name: /Empezar partida/ }).click();
    await expect(page.getByRole('group', { name: 'Tablero de Conecta 4' })).toBeVisible();

    const desborde = await page.evaluate(() => ({
      h: document.documentElement.scrollWidth > 360,
      v: document.querySelector('[class*="AppShell"][class*="board"]')?.scrollTop ?? 0,
    }));
    expect(desborde.h, 'el tablero desborda a lo ancho').toBe(false);
  });
});
