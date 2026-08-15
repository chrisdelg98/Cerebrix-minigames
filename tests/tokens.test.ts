import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Phase 2 acceptance (docs/PLAN.md): changing --raw-violet-600 repaints the
 * accents across the whole app.
 *
 * Stylelint already bans hex outside palette.css and --raw-* outside theme.css.
 * What it cannot check is that the CHAIN is unbroken — that every semantic token
 * actually resolves to a palette value instead of quietly hardcoding one. A
 * broken link there is invisible until someone changes a brand colour and half
 * the app does not move.
 */

const DESIGN = join(process.cwd(), 'src', 'design');
const TOKENS = join(DESIGN, 'tokens');

function read(file: string): string {
  return readFileSync(join(TOKENS, file), 'utf8');
}

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((entry) => entry.replaceAll('\\', '/'))
    .filter((entry) => entry.endsWith('.css'));
}

describe('the token chain', () => {
  it('routes every accent token through the palette', () => {
    const theme = read('theme.css');

    // --c-accent* must reference a --raw-* token, directly or through color-mix.
    const accents = [...theme.matchAll(/--c-accent[\w-]*:\s*([^;]+);/g)].map((m) => m[1] ?? '');

    expect(accents.length, 'no accent tokens found — did theme.css move?').toBeGreaterThan(0);
    for (const value of accents) {
      expect(value, `accent token does not resolve to the palette: ${value}`).toMatch(/--raw-/);
    }
  });

  it('keeps literal colours inside palette.css and nowhere else', () => {
    const offenders = cssFiles(DESIGN).filter((file) => {
      if (file.endsWith('tokens/palette.css')) return false;
      const source = readFileSync(join(DESIGN, file), 'utf8');
      // Strip comments before looking: a hex in prose is not a hex in a rule.
      return /#[0-9a-fA-F]{3,8}\b/.test(source.replace(/\/\*[\s\S]*?\*\//g, ''));
    });

    expect(offenders).toEqual([]);
  });

  it('declares the layer order up front, so the cascade never depends on imports', () => {
    const index = readFileSync(join(DESIGN, 'index.css'), 'utf8');
    expect(index).toMatch(/@layer\s+tokens,\s*base,\s*components,\s*game,\s*overrides;/);
  });

  it('animates only transform and opacity in the shared catalogue', () => {
    const animations = readFileSync(join(DESIGN, 'animations.css'), 'utf8');

    // Properties appearing inside @keyframes blocks.
    const declared = [...animations.matchAll(/^\s{4}([a-z-]+):/gm)].map((m) => m[1] ?? '');
    const allowed = new Set(['transform', 'opacity', 'stroke-dashoffset']);

    // Guards the regex itself: an empty list would make this test vacuous.
    expect(declared.length, 'no keyframe declarations matched').toBeGreaterThan(5);

    for (const property of declared) {
      expect(allowed.has(property), `${property} is not compositor-friendly`).toBe(true);
    }
  });
});
