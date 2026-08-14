import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * The architecture rules of docs/PLAN.md are only worth anything if they
 * actually fire. During Phase 0 the boundaries config was wrong in two
 * different ways and passed silently both times — a rule that never triggers is
 * worse than no rule, because it buys false confidence.
 *
 * Each case writes a real fixture file (the TypeScript parser needs the file to
 * exist to build its program), lints it, and asserts the violation is caught.
 * Fixture names are prefixed so they can never collide with real source files.
 */

const root = process.cwd();
const eslint = new ESLint({ cwd: root });

const created: string[] = [];

function fixture(relPath: string, code: string): string {
  const absolute = join(root, relPath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, code, 'utf8');
  created.push(absolute);
  return absolute;
}

async function errorsFor(relPath: string, code: string): Promise<string> {
  const absolute = fixture(relPath, code);
  const results = await eslint.lintFiles([absolute]);
  return (results[0]?.messages ?? [])
    .filter((m) => m.severity === 2)
    .map((m) => m.message)
    .join('\n');
}

afterAll(() => {
  for (const file of created) rmSync(file, { force: true });
  // Directories that only ever held fixtures.
  rmSync(join(root, 'src/games/__fixture_a__'), { recursive: true, force: true });
  rmSync(join(root, 'src/games/__fixture_b__'), { recursive: true, force: true });
});

describe('boundary rules', () => {
  it('rejects /core importing a game', async () => {
    const errors = await errorsFor(
      'src/core/__fixture_core__.ts',
      `import { x } from '@games/sudoku';\nexport const a = x;\n`
    );
    expect(errors).toMatch(/must not import a game/);
  });

  it('rejects one game importing another', async () => {
    const errors = await errorsFor(
      'src/games/__fixture_a__/index.ts',
      `import { x } from '@games/__fixture_b__';\nexport const a = x;\n`
    );
    expect(errors).toMatch(/must not import another game/);
  });

  it('rejects a game engine importing React', async () => {
    const errors = await errorsFor(
      'src/games/__fixture_a__/engine/__fixture_react__.ts',
      `import { useState } from 'react';\nexport const a = useState;\n`
    );
    expect(errors).toMatch(/framework-free/);
  });

  it('rejects a game engine importing the design system', async () => {
    const errors = await errorsFor(
      'src/games/__fixture_a__/engine/__fixture_design__.ts',
      `import type { CSSVars } from '@design/types';\nexport type A = CSSVars;\n`
    );
    expect(errors).toMatch(/framework-free/);
  });

  it('rejects /design importing /core', async () => {
    const errors = await errorsFor(
      'src/design/__fixture_design__.ts',
      `import { x } from '@core/router';\nexport const a = x;\n`
    );
    expect(errors).toMatch(/lowest layer/);
  });

  it('rejects /storage importing /design', async () => {
    const errors = await errorsFor(
      'src/storage/__fixture_storage__.ts',
      `import type { CSSVars } from '@design/types';\nexport type A = CSSVars;\n`
    );
    expect(errors).toMatch(/stay independent/);
  });
});

describe('inline style rule', () => {
  it('rejects a real CSS property in an inline style', async () => {
    const errors = await errorsFor(
      'src/design/__fixture_bad_style__.tsx',
      `export const B = () => <div style={{ padding: 16 }} />;\n`
    );
    expect(errors).toMatch(/Inline styles are not allowed/);
  });

  it('allows an inline style holding only custom properties', async () => {
    const errors = await errorsFor(
      'src/design/__fixture_good_style__.tsx',
      `import type { CSSVars } from './types';\n` +
        `export const G = ({ i }: { i: number }) => <div style={{ '--i': i } as CSSVars} />;\n`
    );
    expect(errors).not.toMatch(/Inline styles are not allowed/);
  });
});
