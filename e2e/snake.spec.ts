import { expect, test, type Page } from '@playwright/test';

/**
 * Snake en un teléfono de verdad.
 *
 * Es el primer juego que corre solo, así que casi nada de esto se puede probar
 * en jsdom: el reloj, el deslizamiento del cuerpo entre casillas, y el gesto
 * del pulgar que gira sin levantar el dedo.
 */

/*
 * En serie, no en paralelo.
 *
 * Snake depende del reloj: un paso dura 220 ms y varios de estos tests miden
 * qué pasó en ese rato. Con cuatro navegadores compitiendo por los mismos
 * núcleos, el reloj del navegador se atrasa y los tests fallan por la máquina y
 * no por el juego — pasaban de a uno y fallaban todos juntos.
 */
test.describe.configure({ mode: 'serial' });

async function start(page: Page) {
  await page.goto('/arcade/snake');
  await page.getByRole('button', { name: 'Empezar partida' }).click();
  await expect(page.getByRole('img', { name: /Snake/ })).toBeVisible();
}

const length = (page: Page) =>
  page
    .getByRole('img', { name: /Snake/ })
    .getAttribute('aria-label')
    .then((label) => Number(/(\d+) de largo/.exec(label ?? '')?.[1] ?? 0));

/** Un arrastre del pulgar, con pasos intermedios como los de una mano. */
async function swipe(page: Page, dx: number, dy: number) {
  const field = page.getByRole('img', { name: /Snake/ });
  const box = await field.boundingBox();
  if (!box) throw new Error('sin tablero');

  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);

  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 6; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x + (dx * step) / 6, y: y + (dy * step) / 6 }],
    });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('el reloj corre solo: la víbora se mueve sin que la toques', async ({ page }) => {
  await start(page);

  // La cabeza y no el primer <span>, que es la fruta y se queda quieta hasta
  // que alguien la come.
  const head = page.locator('[data-head="true"]');
  const before = await head.getAttribute('style');

  // Un paso del nivel 1 dura 220 ms. Esperar más sería medir después de que la
  // víbora ya llegó a la pared: arranca en la columna 4 de 9 y va derecho.
  await page.waitForTimeout(300);

  const after = await head.getAttribute('style');
  expect(after, 'el tablero quedó quieto sin que nadie lo tocara').not.toBe(before);
});

test('el pulgar hace girar sin levantar el dedo', async ({ page }) => {
  await start(page);

  // Arranca yendo a la derecha; girar hacia abajo es un giro válido.
  await swipe(page, 0, 60);
  await page.waitForTimeout(500);

  // Si el giro no hubiera entrado, ya habría chocado contra la pared derecha.
  await expect(page.getByText('Chocaste.')).toBeHidden();
});

/*
 * El reloj no se altera cuando el jugador gira.
 *
 * Antes el efecto que agenda el paso tenía el estado entre sus dependencias, así
 * que cada giro lo volvía a montar: cancelaba el paso en camino y arrancaba un
 * intervalo nuevo desde cero. Girando a mitad de cada paso, los intervalos
 * reales medían 237, 580 y 781 ms contra los 220 que pide el motor — y en
 * pantalla se veía como si la víbora frenara para doblar.
 *
 * Es una regresión que solo se puede ver acá: hace falta un reloj de verdad.
 */
test('girar no frena el reloj', async ({ page }) => {
  await start(page);

  await page.evaluate(() => {
    const w = window as unknown as { pasos: number[] };
    w.pasos = [];
    let last = '';
    let at = performance.now();
    setInterval(() => {
      const style = document.querySelector('[data-head="true"]')?.getAttribute('style') ?? '';
      if (style === '') return;
      if (last === '') {
        last = style;
        at = performance.now();
        return;
      }
      if (style !== last) {
        w.pasos.push(Math.round(performance.now() - at));
        at = performance.now();
        last = style;
      }
    }, 8);
  });

  // Un giro cada 90 ms, o sea a mitad de camino de cada paso de 220 ms: justo
  // donde el reloj se reprogramaba.
  const dirs = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowRight'];
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press(dirs[i % 4]);
    await page.waitForTimeout(90);
  }

  const pasos = await page.evaluate(() => (window as unknown as { pasos: number[] }).pasos.slice());

  expect(pasos.length, 'la víbora casi no avanzó mientras giraba').toBeGreaterThan(4);

  /*
   * La MEDIANA y no el máximo.
   *
   * Con varias suites de navegador repartiéndose los núcleos, un paso suelto se
   * estira y no dice nada del código. La regresión que este test cuida no era
   * un pico: era que TODOS los pasos se iban a 580-781 ms, y contra eso la
   * mediana es la medida correcta — y además no se puede engañar con suerte.
   */
  const ordenados = [...pasos].sort((a, b) => a - b);
  const mediana = ordenados[Math.floor(ordenados.length / 2)] ?? 0;
  expect(mediana, `la mediana fue ${String(mediana)}ms en vez de ~220`).toBeLessThan(330);
});

test('la pausa detiene el reloj y tapa el tablero', async ({ page }) => {
  await start(page);

  await page.getByRole('button', { name: 'Pausa' }).click();
  await expect(page.getByRole('heading', { name: 'En pausa' })).toBeVisible();

  const paused = await length(page);
  await page.waitForTimeout(900);
  expect(await length(page), 'el reloj siguió corriendo en pausa').toBe(paused);

  await page.getByRole('button', { name: 'Seguir jugando' }).click();
  await expect(page.getByRole('heading', { name: 'En pausa' })).toBeHidden();
});

test('chocar contra la pared termina la partida', async ({ page }) => {
  await start(page);

  // Sin tocar nada va derecho hasta la pared: el nivel 1 son nueve columnas.
  await expect(page.getByRole('heading', { name: 'Se terminó' })).toBeVisible({ timeout: 15_000 });
});

test('está en el estante Arcade de la portada y lleva a /arcade', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Arcade/ }).click();

  const card = page.locator('a[href="/arcade/snake"]');
  await expect(card).toBeVisible();
  await expect(card.getByText('Snake')).toBeVisible();
});

/*
 * Se gira sin tocar el tablero.
 *
 * Con el gesto encima del tablero había que taparlo con la mano justo cuando
 * hacía falta verlo. El área de gesto ahora es todo el escenario, así que se
 * puede girar desde el margen — esto lo comprueba deslizando por DEBAJO del
 * tablero y verificando que la víbora respondió.
 */
test('gira deslizando fuera del tablero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/arcade/snake');
  await page.getByRole('button', { name: /Empezar partida/ }).click();
  await page.waitForTimeout(300);

  const cajas = await page.evaluate(() => {
    const caja = (sel: string) => {
      const el = document.querySelector(sel);
      if (el === null) return null;
      const r = el.getBoundingClientRect();
      return { y: r.y, h: r.height };
    };
    return {
      area: caja('[class*="SwipeArea"]'),
      tablero: caja('[class*="SnakeView"][class*="frame"]'),
    };
  });

  const area = cajas.area;
  const tablero = cajas.tablero;
  expect(area, 'no hay área de gesto').not.toBeNull();
  expect(tablero).not.toBeNull();
  if (area === null || tablero === null) return;

  const y = Math.round(area.y + area.h - 12);
  expect(y, 'el área no sobresale del tablero').toBeGreaterThan(tablero.y + tablero.h);

  const posiciones = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[class*="segment"]'))
        .map((e) => (e as HTMLElement).style.cssText)
        .join('|')
    );
  const antes = await posiciones();

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 195, y }],
  });
  for (let i = 1; i <= 6; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 195, y: y - i * 12 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(700);

  expect(await posiciones(), 'el gesto fuera del tablero no hizo nada').not.toBe(antes);
});
