import { test } from '@playwright/test';

test('bandas', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/arcade/stack');
  await page.getByRole('button', { name: /Dificultad/i }).click();
  await page.getByRole('button', { name: 'Normal' }).click();
  await page.getByRole('button', { name: /Empezar|Continuar/ }).click();
  const board = page.getByRole('button', { name: /Soltar/ });
  await board.waitFor();

  let apoyos = 0;
  for (let i = 0; i < 1200 && apoyos < 17; i += 1) {
    if (!(await board.isVisible().catch(() => false))) break;
    const ok = await page.evaluate(() => {
      const mov = document.querySelector('[class*="moving"]');
      const piezas = Array.from(document.querySelectorAll('[class*="piece"]'));
      const cima = piezas[piezas.length - 1];
      if (!mov || !cima) return false;
      return Math.abs(mov.getBoundingClientRect().left - cima.getBoundingClientRect().left) < 10;
    });
    if (ok) {
      apoyos += 1;
      await board.click({ force: true });
      await page.waitForTimeout(50);
    } else {
      await page.waitForTimeout(15);
    }
  }
  const info = await page.evaluate(() => {
    const piezas = Array.from(document.querySelectorAll('[class*="piece"]'));
    return {
      apoyadas: piezas.length,
      etiqueta: document.querySelector('[class*="field"]')?.getAttribute('aria-label'),
      muestra: piezas.slice(0, 3).map((n) => ({
        style: n.getAttribute('style'),
        bg: getComputedStyle(n).backgroundColor,
        rect: JSON.stringify(n.getBoundingClientRect().toJSON()),
      })),
    };
  });
  console.log('INFO:', JSON.stringify(info, null, 1));
  if (await board.isVisible().catch(() => false)) {
    await board.screenshot({ path: 'test-results/bandas.png' });
  }
});
