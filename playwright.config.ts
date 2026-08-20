import { defineConfig, devices } from '@playwright/test';

/**
 * Los tests que jsdom no puede hacer.
 *
 * La suite de Vitest cubre lógica y estructura, y eso alcanza para casi todo.
 * Pero los dos bugs que llegaron a manos de usuarios eran, por construcción,
 * invisibles ahí: la captura implícita del puntero no existe en jsdom, y un
 * chunk que se pide por HTTP tampoco. Esta suite existe para esa franja —
 * gestos reales, red real, CSS real — y no para repetir lo que ya está cubierto.
 *
 * Corre contra el build de producción, no contra el servidor de desarrollo. Es
 * deliberado: el bug de iOS fue un chunk con hash que no resolvía, y eso solo
 * se puede reproducir donde hay chunks con hash.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  /*
   * Sesenta segundos, no los treinta que trae Playwright.
   *
   * Varios de estos tests recorren flujos largos de verdad — abrir los once
   * juegos, jugar una partida hasta el final, medir el reloj — y encima varias
   * suites se reparten los núcleos. Con el default fallaban por la máquina y no
   * por el código, y siempre distintos: el peor tipo de test, porque enseña a
   * ignorar el rojo. Sigue siendo un techo: un test colgado corta.
   */
  timeout: 60_000,

  use: {
    baseURL: 'http://localhost:4173',
    // Solo al fallar: una traza por corrida verde es basura que nadie abre.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      /*
       * Un teléfono, porque el proyecto se diseña a 360px y el pulgar es el
       * cursor (docs/DESIGN_SYSTEM.md §1). Los dos bugs reportados aparecieron
       * en móvil; un escritorio con mouse no los habría mostrado.
       */
      name: 'móvil',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],

  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
