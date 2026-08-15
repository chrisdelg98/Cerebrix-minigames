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
      .filter((entry) => entry.endsWith('.ts') || entry.endsWith('.tsx'));

    expect(files.length, 'no files scanned — check the path').toBeGreaterThan(0);

    const offenders = files.filter(
      (file) => file !== 'registry.ts' && readFileSync(join(CORE, file), 'utf8').includes('games/')
    );

    expect(offenders).toEqual([]);
  });
});
