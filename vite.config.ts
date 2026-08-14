import { fileURLToPath, URL } from 'node:url';
// `vitest/config` re-exports Vite's defineConfig with the `test` block typed.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const resolvePath = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [react()],

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
