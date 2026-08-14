import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import boundaries from 'eslint-plugin-boundaries';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', '*.config.js'] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/**' },
        { type: 'design', pattern: 'src/design/**' },
        { type: 'storage', pattern: 'src/storage/**' },
        // capture:1 is the game id, so rules can compare one game against another.
        { type: 'game-engine', pattern: 'src/games/*/engine/**', capture: ['id'] },
        { type: 'game', pattern: 'src/games/*/**', capture: ['id'] },
        { type: 'app', pattern: 'src/*' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      /* ─────────── Boundary rules — docs/PLAN.md "Reglas de frontera" ─────────── */
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${file.type} is not allowed to import ${dependency.type}',
          rules: [
            {
              // /design is the lowest layer: it knows nothing about core or games.
              from: ['design'],
              allow: ['design'],
            },
            {
              from: ['storage'],
              allow: ['storage'],
            },
            {
              // /core may use design and storage, but never a specific game.
              // The registry reaches games only through lazy import(), which is
              // exempted below via the ignore list.
              from: ['core'],
              allow: ['core', 'design', 'storage'],
            },
            {
              // A game engine is pure logic: no React, no CSS, no design system.
              // Enforced further by the no-restricted-imports rule below.
              from: ['game-engine'],
              allow: [['game-engine', { id: '${from.id}' }]],
            },
            {
              // A game may use its own files, the design system, storage and core
              // contracts — but never another game.
              from: ['game'],
              allow: ['design', 'storage', 'core', ['game', { id: '${from.id}' }]],
            },
            {
              from: ['app'],
              allow: ['core', 'design', 'storage', 'app'],
            },
          ],
        },
      ],

      /* /core must not statically import a game. The registry uses import(). */
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@games/*', '**/games/*'],
              message:
                '/core must not import a game statically. Register it in src/core/registry.ts with a lazy import().',
            },
          ],
        },
      ],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  /* ─────────── Game engines: pure logic only ─────────── */
  {
    files: ['src/games/*/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', '@design/*', '**/*.css'],
              message:
                'Game engines must stay framework-free so they can be tested without a DOM and run inside a Web Worker. See docs/GAME_CONTRACT.md §2.',
            },
          ],
        },
      ],
    },
  },

  /* ─────────── The registry is the one place allowed to name games ─────────── */
  {
    files: ['src/core/registry.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  /* ─────────── Inline styles: only CSS custom properties ─────────── */
  {
    files: ['**/*.tsx'],
    rules: {
      // docs/STYLING.md §5 — `style` is allowed only as a data channel for
      // custom properties (--i, --cols, --cell-size). Any real CSS property
      // there bypasses the token system and cannot be themed or linted.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.value!=/^--/][computed=false]",
          message:
            'Inline styles are not allowed. Use a CSS Module. The only exception is passing CSS custom properties (keys starting with "--"). See docs/STYLING.md §5.',
        },
        {
          selector:
            "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression > Property[key.type='Identifier']",
          message:
            'Inline styles are not allowed. Use a CSS Module. Custom properties must be quoted string keys, e.g. {"--i": index}. See docs/STYLING.md §5.',
        },
      ],
    },
  },

  /* ─────────── Tests ─────────── */
  {
    files: ['tests/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  }
);
