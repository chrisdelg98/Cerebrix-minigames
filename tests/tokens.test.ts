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

/* ─────────── Contrast, computed from the tokens themselves ─────────── */

function parseHex(hex: string): [number, number, number] {
  const value = hex.trim().replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const channel = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = parseHex(hex).map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** --raw-* name → literal value, read straight from palette.css. */
function palette(): Map<string, string> {
  const source = read('palette.css');
  return new Map(
    [...source.matchAll(/(--raw-[\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)].map((m) => [
      m[1] ?? '',
      m[2] ?? '',
    ])
  );
}

/** Resolves one semantic token inside one theme block down to a literal colour. */
function resolve(block: string, token: string, colours: Map<string, string>): string {
  const declaration = new RegExp(`${token}:\\s*var\\((--raw-[\\w-]+)\\);`).exec(block);
  expect(declaration, `${token} is not declared as a plain palette reference`).not.toBeNull();
  const value = colours.get(declaration?.[1] ?? '');
  expect(value, `${token} points at a palette entry that does not exist`).toBeDefined();
  return value ?? '';
}

describe('accent contrast', () => {
  /**
   * The accent has to clear AA in two directions at once, and those directions
   * fight each other: brighter reads better ON the background and worse UNDER
   * white text. A single token failed both in dark (4.46 and 4.23) until it was
   * split into --c-accent and --c-accent-surface.
   *
   * Computed from the tokens rather than hardcoded, so changing a palette value
   * is what this catches — that is the whole point of the token layer.
   * docs/DESIGN_SYSTEM.md §2.3
   */
  const theme = read('theme.css');
  const [dark = '', light = ''] = theme.split(/\[data-theme='light'\]/);

  it.each([
    ['dark', dark],
    ['light', light],
  ])('clears AA in the %s theme, in both directions', (_name, block) => {
    const colours = palette();

    const background = resolve(block, '--c-bg', colours);
    const accent = resolve(block, '--c-accent', colours);
    const surface = resolve(block, '--c-accent-surface', colours);
    const onAccent = resolve(block, '--c-text-on-accent', colours);

    expect(
      contrast(accent, background),
      'accent read AS a colour on the background'
    ).toBeGreaterThanOrEqual(4.5);
    expect(contrast(onAccent, surface), 'text read ON the accent surface').toBeGreaterThanOrEqual(
      4.5
    );
  });
});

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
