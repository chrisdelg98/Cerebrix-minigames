import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ESLint } from 'eslint';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * The architecture rules of docs/PLAN.md are only worth anything if they
 * actually fire. During Phase 0 the boundaries config was wrong in two
 * different ways and passed silently both times — a rule that never triggers is
 * worse than no rule, because it buys false confidence.
 *
 * Every fixture is written BEFORE the first lint, and all of them are linted in
 * a single pass. That is not a style preference. typescript-eslint builds the
 * TypeScript Program on the first `lintFiles()` call and caches it, so a
 * fixture created after that call is absent from the program and comes back as
 *
 *     Parsing error: "parserOptions.project" has been provided ...
 *     but the file was not found in any of the provided project(s)
 *
 * That parse error REPLACES the rule message. Assertions that only look for
 * their own message therefore fail, and — worse — assertions of the
 * `not.toMatch` kind pass for entirely the wrong reason. Hence the explicit
 * "no parse error" guard in every case: this failure mode must never again be
 * able to disguise itself.
 */

interface Case {
  /** Repo-relative path. Prefixed so it can never collide with real source. */
  readonly file: string;
  readonly code: string;
  /** The rule message this illegal code must produce. */
  readonly mustMatch?: RegExp;
  /** A message this legal code must NOT produce. */
  readonly mustNotMatch?: RegExp;
}

const CASES: Record<string, Case> = {
  '/core must not import a game': {
    file: 'src/core/__fixture_core__.ts',
    code: `import { x } from '@games/sudoku';\nexport const a = x;\n`,
    mustMatch: /must not import a game/,
  },
  'a game must not import another game': {
    file: 'src/games/__fixture_a__/index.ts',
    code: `import { x } from '@games/__fixture_b__';\nexport const a = x;\n`,
    mustMatch: /must not import another game/,
  },
  'a game engine must not import React': {
    file: 'src/games/__fixture_a__/engine/__fixture_react__.ts',
    code: `import { useState } from 'react';\nexport const a = useState;\n`,
    mustMatch: /framework-free/,
  },
  'a game engine must not import the design system': {
    file: 'src/games/__fixture_a__/engine/__fixture_design__.ts',
    code: `import type { CSSVars } from '@design/types';\nexport type A = CSSVars;\n`,
    mustMatch: /framework-free/,
  },
  '/design must not import /core': {
    file: 'src/design/__fixture_design__.ts',
    code: `import { x } from '@core/router';\nexport const a = x;\n`,
    mustMatch: /lowest layer/,
  },
  '/storage must not import /design': {
    file: 'src/storage/__fixture_storage__.ts',
    code: `import type { CSSVars } from '@design/types';\nexport type A = CSSVars;\n`,
    mustMatch: /stay independent/,
  },
  'an inline style with a real CSS property is rejected': {
    file: 'src/design/__fixture_bad_style__.tsx',
    code: `export const B = () => <div style={{ padding: 16 }} />;\n`,
    mustMatch: /Inline styles are not allowed/,
  },
  'an inline style holding only custom properties is allowed': {
    file: 'src/design/__fixture_good_style__.tsx',
    code:
      `import type { CSSVars } from './types';\n` +
      `export const G = ({ i }: { i: number }) => <div style={{ '--i': i } as CSSVars} />;\n`,
    mustNotMatch: /Inline styles are not allowed/,
  },
};

const root = process.cwd();

/** Errors keyed by repo-relative fixture path. */
const errorsByFile = new Map<string, string>();

/** Directories this test created, so cleanup removes only its own mess. */
const createdDirs: string[] = [];

function ensureDir(absolute: string): void {
  const dir = dirname(absolute);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    createdDirs.push(dir);
  }
}

beforeAll(async () => {
  const paths = Object.values(CASES).map(({ file, code }) => {
    const absolute = join(root, file);
    ensureDir(absolute);
    writeFileSync(absolute, code, 'utf8');
    return absolute;
  });

  // One pass, one TypeScript Program, every fixture already on disk.
  const results = await new ESLint({ cwd: root }).lintFiles(paths);

  for (const result of results) {
    const relative = result.filePath.slice(root.length + 1).replaceAll('\\', '/');
    errorsByFile.set(
      relative,
      result.messages
        .filter((message) => message.severity === 2)
        .map((message) => message.message)
        .join('\n')
    );
  }
  // Building the program from cold is slow on a first CI run; the whole suite
  // is one pass, so the budget is generous on purpose.
}, 120_000);

afterAll(() => {
  for (const { file } of Object.values(CASES)) rmSync(join(root, file), { force: true });
  // Deepest first, so a nested fixture directory is gone before its parent.
  for (const dir of [...createdDirs].reverse()) rmSync(dir, { recursive: true, force: true });
});

describe.each(Object.entries(CASES))('%s', (_name, testCase) => {
  it('is enforced by the lint config', () => {
    const errors = errorsByFile.get(testCase.file);

    expect(errors, `no lint result for ${testCase.file}`).toBeDefined();
    // Guards the failure mode described at the top of this file.
    expect(errors).not.toMatch(/Parsing error/);

    if (testCase.mustMatch) expect(errors).toMatch(testCase.mustMatch);
    if (testCase.mustNotMatch) expect(errors).not.toMatch(testCase.mustNotMatch);
  });
});
