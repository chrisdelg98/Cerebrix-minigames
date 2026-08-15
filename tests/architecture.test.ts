import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Phase 1 acceptance (docs/PLAN.md): `grep -r "games/" src/core/` returns only
 * registry.ts. The lint rules already forbid the static import; this asserts the
 * stronger property that /core does not so much as mention a game anywhere else,
 * not even in a dynamic import or a bare string.
 */

const CORE = join(process.cwd(), 'src', 'core');

describe('/core knows no game', () => {
  it('mentions games/ only in the registry', () => {
    const files = readdirSync(CORE, { recursive: true, encoding: 'utf8' })
      .map((entry) => entry.replaceAll('\\', '/'))
      .filter((entry) => entry.endsWith('.ts') || entry.endsWith('.tsx'))
      // boundaries.test.ts writes illegal-import fixtures into src/core and
      // deletes them again. Vitest runs suites in parallel workers, so those
      // files can exist on disk while this one is scanning — the reason they
      // carry a prefix that no real source file uses.
      .filter((entry) => !entry.includes('__fixture'));

    expect(files.length, 'no files scanned — check the path').toBeGreaterThan(0);

    const offenders = files.filter(
      (file) => file !== 'registry.ts' && readFileSync(join(CORE, file), 'utf8').includes('games/')
    );

    expect(offenders).toEqual([]);
  });
});
