/**
 * Writes the PWA icons into public/ as real PNGs.
 *
 *   node scripts/generate-icons.mjs
 *
 * Hand-rolled rather than pulled from an image library: the mark is a rounded
 * square plus four smaller ones, which is a handful of filled rectangles — not
 * worth a rasteriser, a native build step or another supply-chain surface for a
 * project whose .npmrc turns install scripts off on purpose.
 *
 * Icons are PNG and not SVG because an installed app is where format support
 * gets strict: iOS ignores an SVG apple-touch-icon outright, and maskable SVG
 * is uneven across Android launchers.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

/** Brand teal and white — the same values as tokens/palette.css. */
const TEAL = [13, 148, 136];
const WHITE = [255, 255, 255];

/* ─────────────────────────── PNG encoding ─────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** `pixels` is RGB, row-major. */
function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  // 10-12 stay zero: deflate, adaptive filtering, no interlace.

  // Every scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const from = y * size * 3;
    const to = y * (size * 3 + 1);
    raw[to] = 0;
    pixels.copy(raw, to + 1, from, from + size * 3);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ─────────────────────────── Drawing ─────────────────────────── */

function canvas(size, [r, g, b]) {
  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    pixels[i * 3] = r;
    pixels[i * 3 + 1] = g;
    pixels[i * 3 + 2] = b;
  }
  return pixels;
}

/** Rounded rectangle, in fractions of the canvas so it scales with any size. */
function roundedRect(pixels, size, x0, y0, w, h, radius, [r, g, b], alpha = 1) {
  const px = Math.round(x0 * size);
  const py = Math.round(y0 * size);
  const pw = Math.round(w * size);
  const ph = Math.round(h * size);
  const pr = Math.round(radius * size);

  for (let y = py; y < py + ph; y++) {
    for (let x = px; x < px + pw; x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;

      // Corner test: outside the quarter-circle means outside the shape.
      const dx = Math.max(px + pr - x, x - (px + pw - 1 - pr), 0);
      const dy = Math.max(py + pr - y, y - (py + ph - 1 - pr), 0);
      if (dx * dx + dy * dy > pr * pr) continue;

      const i = (y * size + x) * 3;
      pixels[i] = Math.round(pixels[i] * (1 - alpha) + r * alpha);
      pixels[i + 1] = Math.round(pixels[i + 1] * (1 - alpha) + g * alpha);
      pixels[i + 2] = Math.round(pixels[i + 2] * (1 - alpha) + b * alpha);
    }
  }
}

/**
 * @param inset how much of the canvas the mark leaves free on each side. A
 *   maskable icon needs its content inside the middle 80%, because launchers
 *   crop the rest to whatever shape they please.
 */
function drawMark(size, { rounded, inset }) {
  const pixels = canvas(size, TEAL);
  if (rounded) {
    // Non-maskable icons carry their own rounded corners.
    const bg = canvas(size, [0, 0, 0]);
    bg.fill(0);
    roundedRect(bg, size, 0, 0, 1, 1, 0.22, TEAL);
    bg.copy(pixels);
  }

  const span = 1 - inset * 2;
  const cell = span * 0.42;
  const gap = span - cell * 2;

  // Four tiles, the back one faded — the same mark as the favicon.
  roundedRect(pixels, size, inset, inset, cell, cell, cell * 0.22, WHITE);
  roundedRect(pixels, size, inset + cell + gap, inset, cell, cell, cell * 0.22, WHITE, 0.55);
  roundedRect(pixels, size, inset, inset + cell + gap, cell, cell, cell * 0.22, WHITE, 0.55);
  roundedRect(pixels, size, inset + cell + gap, inset + cell + gap, cell, cell, cell * 0.22, WHITE);

  return pixels;
}

const ICONS = [
  { file: 'icon-192.png', size: 192, rounded: true, inset: 0.18 },
  { file: 'icon-512.png', size: 512, rounded: true, inset: 0.18 },
  // Full bleed, mark pulled in: the launcher crops this one.
  { file: 'icon-maskable-512.png', size: 512, rounded: false, inset: 0.26 },
  { file: 'apple-touch-icon.png', size: 180, rounded: false, inset: 0.18 },
];

for (const { file, size, rounded, inset } of ICONS) {
  writeFileSync(join(OUT, file), encodePng(size, drawMark(size, { rounded, inset })));
  console.log(`${file}  ${String(size)}×${String(size)}`);
}
