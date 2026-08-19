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
        project: ['./tsconfig.app.json', './tsconfig.node.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      // boundaries resolves each import to a file before it can classify it.
      // The bundled node resolver only knows .js/.json, so without these
      // extensions every TypeScript import resolves to "unknown" and the rules
      // quietly pass. Aliases are declared here too, mirroring tsconfig.app.json
      // and vite.config.ts.
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          moduleDirectory: ['node_modules', 'src'],
        },
      },

      'boundaries/include': ['src/**/*'],
      // A pattern describes the element's DIRECTORY, not the files inside it —
      // every file under src/games/sudoku belongs to the 'game' element. Pointing
      // patterns at files instead (src/games/*/**/*) makes every file fall
      // through to the broadest element and the rules silently never fire.
      // Verified by the illegal-import cases in tests/boundaries.test.ts.
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core' },
        { type: 'design', pattern: 'src/design' },
        { type: 'storage', pattern: 'src/storage' },
        // The capture holds the game id, so policies can tell one game from
        // another. The nested elements are listed first: they live inside a
        // game and need to win over the broader 'game' element.
        //
        // `game-data` exists so the engine can read its own puzzles without
        // being handed the whole game. Widening the policy to "engine may
        // import its game" would have let it reach into view/ and drag React
        // in through the back door.
        { type: 'game-data', pattern: 'src/games/*/data', capture: ['id'] },
        { type: 'game-engine', pattern: 'src/games/*/engine', capture: ['id'] },
        { type: 'game', pattern: 'src/games/*', capture: ['id'] },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      /* ─────────── Boundary rules — docs/PLAN.md "Reglas de frontera" ─────────── */
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: '{{from.type}} is not allowed to import {{to.type}}',
          policies: [
            {
              // /design is the lowest layer: it knows nothing about core or games.
              from: [{ element: { type: 'design' } }],
              allow: [{ to: { element: { type: 'design' } } }],
            },
            {
              from: [{ element: { type: 'storage' } }],
              allow: [{ to: { element: { type: 'storage' } } }],
            },
            {
              // /core may use design and storage, but never a specific game.
              // The registry reaches games only through lazy import(), and is
              // exempted from the no-restricted-imports rule below.
              from: [{ element: { type: 'core' } }],
              allow: [
                { to: { element: { type: 'core' } } },
                { to: { element: { type: 'design' } } },
                { to: { element: { type: 'storage' } } },
              ],
            },
            {
              // A game engine is pure logic: no React, no CSS, no design system.
              // Enforced further by the no-restricted-imports override below.
              // It may read /core, because /core is where the contract it
              // implements is declared — and that import is types only.
              from: [{ element: { type: 'game-engine' } }],
              allow: [
                { to: { element: { type: 'game-engine', captured: { id: '{{from.id}}' } } } },
                { to: { element: { type: 'game-data', captured: { id: '{{from.id}}' } } } },
                { to: { element: { type: 'core' } } },
              ],
            },
            {
              // A game may use its own files, the design system, storage and the
              // core contract — but never another game.
              from: [{ element: { type: 'game' } }],
              allow: [
                { to: { element: { type: 'design' } } },
                { to: { element: { type: 'storage' } } },
                { to: { element: { type: 'core' } } },
                { to: { element: { type: 'game', captured: { id: '{{from.id}}' } } } },
                { to: { element: { type: 'game-data', captured: { id: '{{from.id}}' } } } },
              ],
            },
            {
              // A game's own engine is reachable from the game it belongs to.
              from: [{ element: { type: 'game' } }],
              allow: [
                { to: { element: { type: 'game-engine', captured: { id: '{{from.id}}' } } } },
              ],
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

  /*
   * ─────────── Alias-based boundary enforcement ───────────
   *
   * boundaries/dependencies resolves relative imports, but the bundled node
   * resolver cannot follow path aliases, so an aliased import silently
   * resolves to "unknown" and passes. These rules close that hole per layer
   * without pulling in another resolver package.
   *
   * Together with boundaries/dependencies above, every edge in the four
   * boundary rules of docs/PLAN.md is covered.
   */
  {
    files: ['src/design/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@core/*', '@games/*', '@storage/*'],
              message:
                '/design is the lowest layer: it must not know about core, storage or any game. See docs/STYLING.md §1.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/storage/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@core/*', '@games/*', '@design/*'],
              message: '/storage must stay independent of core, design and games.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
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
    },
  },
  {
    files: ['src/games/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Inside a game, its own files are reached relatively. Any use of
              // the @games alias therefore means reaching into another game.
              group: ['@games/*'],
              message:
                'A game must not import another game. Use relative paths for your own files. See docs/GAME_CONTRACT.md §8.',
            },
          ],
        },
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
              group: ['react', 'react-dom', 'react/*', '@design/*', '@games/*', '**/*.css'],
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
      // ESLint's own package ships no resolvable types, so the boundaries test
      // that drives the ESLint API trips every unsafe-* rule. Test-only code.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  }
);
