import { expect, test } from '@playwright/test';

/**
 * La campaña vive entera en el shell: ningún juego sabe que existe. Estas
 * pruebas recorren el camino completo —configurar, empezar, que el juego
 * respete el nivel— porque es todo integración y nada de lógica pura, que ya
 * está cubierta en tests/campaign.test.ts.
 */
test.describe('Campaña', () => {
  test('se configura y arranca', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto('/');

    await page.getByRole('link', { name: /Campaña/ }).click();
    await expect(page.getByRole('heading', { name: 'Victorias por nivel' })).toBeVisible();

    // Preset tranquila: una victoria por nivel, sin castigo.
    await page.getByRole('button', { name: 'Tranquila', exact: true }).click();
    await expect(page.getByText('5 victorias para terminar')).toBeVisible();

    await page.getByRole('button', { name: 'Empezar campaña' }).click();

    // Estado: nivel, progreso del tramo y qué juego toca.
    await expect(page.getByText('Fácil', { exact: true })).toBeVisible();
    await expect(page.getByText('Ahora te toca')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Jugar' })).toBeVisible();
  });

  test('el nivel lo manda la campaña, no el jugador', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto('/campana');

    // Un solo juego, empezando en Difícil: así se comprueba que el nivel viaja.
    await page.getByRole('button', { name: 'Elegir', exact: true }).click();
    await page.getByRole('button', { name: 'Difícil', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar campaña' }).click();

    await page.getByRole('button', { name: 'Jugar' }).click();

    // En campaña no hay selector de dificultad: hay un indicador de campaña.
    await expect(page.getByText(/Campaña · Difícil/)).toBeVisible();
    await expect(page.getByRole('button', { name: /DIFICULTAD/i })).toHaveCount(0);
  });

  test('sobrevive a recargar', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto('/campana');
    await page.getByRole('button', { name: 'Clásica', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar campaña' }).click();
    await expect(page.getByText('Ahora te toca')).toBeVisible();

    await page.reload();

    // La campaña sigue ahí, y la portada lo dice.
    await expect(page.getByText('Ahora te toca')).toBeVisible();
    await page.goto('/');
    await expect(page.getByText(/En curso · Fácil · 0 de 2/)).toBeVisible();
  });

  /*
   * El aviso existe porque la mitad del estante NO SE PUEDE PERDER: con un
   * conjunto solo de lógica, un castigo por perder no hace absolutamente nada, y
   * callárselo sería dejar que el jugador configure algo inerte.
   */
  test('avisa cuando el castigo no puede aplicarse', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 });
    await page.goto('/campana');

    await page.getByRole('button', { name: 'Solo lógica', exact: true }).click();
    await page.getByRole('button', { name: 'Reinicia el tramo', exact: true }).click();

    await expect(page.getByText(/esos juegos no se pueden perder/)).toBeVisible();
  });
});
