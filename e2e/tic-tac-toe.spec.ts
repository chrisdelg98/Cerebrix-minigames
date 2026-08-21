import { expect, test } from '@playwright/test';

/**
 * El primer juego de dos personas, que es lo que estrena el contrato: modos,
 * empate y un ganador con nombre. Se prueba acá y no en jsdom porque lo que
 * puede fallar es de navegador — que el selector de modo se vea y se toque, y
 * que al elegir "dos jugadores" el nivel desaparezca de verdad.
 */
test.describe('Tres en línea', () => {
  test('ofrece los dos modos y esconde el nivel cuando no cuenta', async ({ page }) => {
    await page.goto('/game/tic-tac-toe');

    const maquina = page.getByRole('button', { name: 'Contra la máquina' });
    const dos = page.getByRole('button', { name: 'Dos jugadores' });
    await expect(maquina).toBeVisible();
    await expect(dos).toBeVisible();

    // Contra la máquina el nivel manda, así que el selector está.
    await expect(
      page.getByRole('button', { name: /Nivel|Dificultad|Fácil|Normal/ }).first()
    ).toBeVisible();

    await dos.click();
    await expect(page.getByText(/no cuenta para tu historial/)).toBeVisible();
  });

  /*
   * Guarda el modal de victoria COMPARTIDO, no este juego: la copa rebota hasta
   * scale(1.09) girada 8° dentro de un cuerpo que scrollea, y ese desborde
   * transitorio sacaba la barra por los 680ms de la animación. Se prueba desde
   * acá porque el tres en línea a dos jugadores es la forma más corta de llegar
   * a una victoria — cinco toques y sin máquina que conteste.
   */
  test('la copa rebota sin sacar la barra de scroll', async ({ page }) => {
    await page.goto('/game/tic-tac-toe');
    await page.getByRole('button', { name: 'Dos jugadores' }).click();
    await page.getByRole('button', { name: /Empezar partida/ }).click();

    const tablero = page.getByRole('grid', { name: 'Tablero de Tres en línea' });
    for (const nombre of [
      'arriba izquierda',
      'izquierda',
      'arriba centro',
      'centro',
      'arriba derecha',
    ]) {
      await tablero.getByRole('gridcell', { name: `${nombre}, vacía`, exact: true }).click();
    }
    await expect(page.getByText('Ganan las X')).toBeVisible();

    const desborde = await page.evaluate(async () => {
      let peor = 0;
      for (let t = 0; t <= 900; t += 60) {
        const cuerpo = document.querySelector('dialog[open] [class*="body"]');
        if (cuerpo !== null) peor = Math.max(peor, cuerpo.scrollHeight - cuerpo.clientHeight);
        await new Promise((res) => setTimeout(res, 60));
      }
      return peor;
    });

    // Sin el aire reservado esto mide 8px a los 240ms.
    expect(desborde, 'la copa desbordó el cuerpo del modal').toBe(0);
  });

  test('se juega: la ficha aparece donde se toca', async ({ page }) => {
    await page.goto('/game/tic-tac-toe');
    await page.getByRole('button', { name: 'Dos jugadores' }).click();
    await page.getByRole('button', { name: /Empezar partida/ }).click();

    const tablero = page.getByRole('grid', { name: 'Tablero de Tres en línea' });
    await expect(tablero).toBeVisible();

    // Las casillas son `gridcell`, no `button`: el tablero es una grilla.
    await tablero.getByRole('gridcell', { name: 'centro, vacía', exact: true }).click();

    // Entre dos personas nadie contesta: hay exactamente una ficha puesta.
    await expect(tablero.getByRole('gridcell', { name: /, equis$/ })).toHaveCount(1);
    await expect(tablero.getByRole('gridcell', { name: /, círculo$/ })).toHaveCount(0);
    await expect(page.getByText('Juegan las O')).toBeVisible();
  });
});
