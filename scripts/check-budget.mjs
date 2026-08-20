/**
 * Presupuesto de tamaño, verificado sobre el build real.
 *
 * Es el ítem de la Fase 7 del plan: bundle inicial ≤ 120 kB gzip, cada juego
 * ≤ 60 kB. Existe para que no haga falta acordarse — cada juego que se agregue
 * queda medido solo, y una dependencia que se cuela en el bundle inicial rompe
 * el build en vez de descubrirse en un teléfono lento seis meses después.
 *
 *   node scripts/check-budget.mjs
 *
 * Se mide en gzip porque es lo que viaja por la red. Cada juego se mide por SU
 * chunk: la maquinaria compartida (GameRoute, Cell, Grid) se descarga una sola
 * vez para todos, así que cargársela a cada uno contaría diez veces lo mismo.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');
const REGISTRY = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'registry.ts');

const KB = 1024;
const BUDGET_INITIAL = 120 * KB;
const BUDGET_GAME = 60 * KB;

/** Lo que pesa un archivo una vez comprimido, que es lo que se descarga. */
function gzipped(file) {
  return gzipSync(readFileSync(join(ASSETS, file))).length;
}

/** Los ids reales, leídos del registro: un juego nuevo entra acá solo. */
function gameIds() {
  const source = readFileSync(REGISTRY, 'utf8');
  return [...source.matchAll(/^\s{4}id: '([^']+)',$/gm)].map((match) => match[1]);
}

function sizeOf(files) {
  return files.reduce((total, file) => total + gzipped(file), 0);
}

/*
 * Cosas que NO pueden viajar en el arranque, por más chicas que sean.
 *
 * Cada una está detrás de un import() a propósito, y ese import() se rompe con
 * una facilidad incómoda: `import { type X } from './Y'` con
 * verbatimModuleSyntax deja `import './Y'` en la salida, el módulo vuelve al
 * grafo estático y la separación desaparece sin que nada falle. Pasó con las
 * chispas de la racha. Se busca una marca del propio código en el paquete
 * inicial.
 */
const FUERA_DEL_ARRANQUE = [{ what: 'chispas de la racha', needle: 'spark-rise' }];

const files = readdirSync(ASSETS);
// String.raw y no un template normal: en uno normal `\w` no es un escape
// válido, JS lo colapsa a `w`, y el patrón deja de buscar lo que dice buscar.
const belongingTo = (name) =>
  files.filter((file) => new RegExp(String.raw`^${name}-[A-Za-z0-9_-]+\.(js|css)$`).test(file));

const rows = [];
let failed = false;

const initial = sizeOf(belongingTo('index'));
rows.push({ what: 'bundle inicial', bytes: initial, budget: BUDGET_INITIAL });
if (initial > BUDGET_INITIAL) failed = true;

for (const id of gameIds()) {
  const chunk = belongingTo(id);
  if (chunk.length === 0) {
    console.error(`✖ ${id}: no se encontró su chunk en dist/assets`);
    failed = true;
    continue;
  }
  const bytes = sizeOf(chunk);
  rows.push({ what: id, bytes, budget: BUDGET_GAME });
  if (bytes > BUDGET_GAME) failed = true;
}

const width = Math.max(...rows.map((row) => row.what.length));
for (const { what, bytes, budget } of rows) {
  const kb = (bytes / KB).toFixed(1).padStart(6);
  const share = Math.round((bytes / budget) * 100);
  const mark = bytes > budget ? '✖' : '✓';
  console.log(
    `${mark} ${what.padEnd(width)}  ${kb} kB gzip   ${String(share).padStart(3)}% del presupuesto`
  );
}

const initialSource = belongingTo('index')
  .map((file) => readFileSync(join(ASSETS, file), 'utf8'))
  .join('');

for (const { what, needle } of FUERA_DEL_ARRANQUE) {
  if (initialSource.includes(needle)) {
    console.error(`✖ ${what}: viaja en el paquete inicial y debería cargarse aparte`);
    failed = true;
  } else {
    console.log(`✓ ${what.padEnd(width)}  fuera del arranque`);
  }
}

if (failed) {
  console.error('\nPresupuesto excedido.');
  process.exit(1);
}
console.log('\nTodo dentro de presupuesto.');
