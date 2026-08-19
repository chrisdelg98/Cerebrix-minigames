import { fileURLToPath, URL } from 'node:url';
// `vitest/config` re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [
    react(),

    /*
     * Offline is not a nicety here: the app is meant for the five minutes on a
     * train, which is exactly where the connection is not.
     *
     * Everything ships precached — shell, design system, every game chunk and
     * every puzzle file — because a game you cannot open offline is a game that
     * is not installed. The whole thing is well under a megabyte, so there is
     * no reason to be clever about it.
     */
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        // .json is what carries the Sudoku puzzles.
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
        cleanupOutdatedCaches: true,
        // Any route falls back to the shell: this is a client-side router, so a
        // deep link opened offline still has to boot the app.
        navigateFallback: 'index.html',
        /*
         * ...pero nunca para un archivo de /assets/.
         *
         * Un chunk que no está devolvería el index.html con content-type
         * text/html, y el import() muere con "'text/html' is not a valid
         * JavaScript MIME type" en vez de fallar como lo que es: un archivo que
         * no está. Que falle limpio es lo que deja al router recuperarse
         * recargando (ver freshChunk en src/core/router.tsx).
         */
        navigateFallbackDenylist: [/^\/assets\//],
      },
      manifest: {
        name: 'Cerebrix',
        short_name: 'Cerebrix',
        description: 'Minijuegos de concentración: Sudoku, Buscaminas y más.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f7f7f8',
        theme_color: '#0d9488',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],

  resolve: {
    // Mirrored in tsconfig.app.json — keep both in sync.
    alias: {
      '@core': resolvePath('./src/core'),
      '@design': resolvePath('./src/design'),
      '@games': resolvePath('./src/games'),
      '@storage': resolvePath('./src/storage'),
    },
  },

  css: {
    modules: {
      // camelCase class names so components can use `s.cellInner` directly.
      localsConvention: 'camelCaseOnly',
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
  },

  build: {
    target: 'es2022',
    cssCodeSplit: true,
    // No manualChunks on purpose. Games are loaded through dynamic import() in
    // the registry, so Vite already emits one chunk per game; hand-rolling a
    // vendor chunk on top of that usually hurts cache hit rates more than it
    // helps. Revisit only if the Phase 7 budgets say otherwise.
    // See docs/PLAN.md, Phase 7.
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Game engines are pure logic and must stay well covered.
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx', 'src/**/sprites/**'],
    },
  },
});
