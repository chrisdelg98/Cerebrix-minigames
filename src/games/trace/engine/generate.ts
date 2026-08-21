import { countPaths, neighbours } from './solve';
import { type TraceConfig } from './types';

function makeRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Techo de pasos por intento de recorrido.
 *
 * Warnsdorff acierta casi siempre a la primera, pero cuando falla el backtracking
 * detrás es exponencial. Sin techo eso no se notaba hasta 6×6 —36 casillas se
 * deshacen rápido— y en 8×8 colgaba la pestaña: el generador corre en el hilo
 * principal, así que "Nueva partida" dejaba el tablero anterior pintado y el
 * reloj en cero para siempre.
 *
 * Rendirse y volver a empezar desde otra casilla es órdenes de magnitud más
 * barato que insistir con un arranque malo.
 */
const WALK_BUDGET = 20_000;

/** Cuántos arranques distintos se prueban antes de recurrir a la serpiente. */
const WALK_TRIES = 60;

/**
 * Un recorrido al azar que pasa por todas las casillas.
 *
 * Elige primero el vecino con menos salidas libres — la heurística de
 * Warnsdorff. Sin ella el recorrido se mete en un rincón y hay que deshacer
 * medio tablero; con ella sale casi siempre al primer intento.
 */
function attempt(size: number, rng: () => number): number[] | null {
  const total = size * size;
  const near = neighbours(size);
  const visited = new Array<boolean>(total).fill(false);
  const path: number[] = [];
  let budget = WALK_BUDGET;

  const free = (at: number): number =>
    (near[at] as number[]).filter((n) => visited[n] !== true).length;

  const walk = (at: number): boolean => {
    if (budget <= 0) return false;
    budget -= 1;

    visited[at] = true;
    path.push(at);
    if (path.length === total) return true;

    const options = (near[at] as number[])
      .filter((n) => visited[n] !== true)
      .map((n) => ({ n, weight: free(n) + rng() * 0.5 }))
      .sort((a, b) => a.weight - b.weight);

    for (const { n } of options) if (walk(n)) return true;

    visited[at] = false;
    path.pop();
    return false;
  };

  const first = Math.floor(rng() * total);
  return walk(first) && path.length === total ? path : null;
}

/**
 * La serpiente: fila por fila, alternando el sentido.
 *
 * Siempre existe en una cuadrícula rectangular y no hay que buscarla, así que
 * es la red de seguridad cuando ningún arranque prosperó. El recorrido queda
 * previsible, pero el jugador no lo ve — solo ve los números — y es
 * infinitamente mejor que devolver un tablero imposible o colgar la pestaña.
 */
function snake(size: number): number[] {
  const path: number[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let i = 0; i < size; i += 1) {
      const col = row % 2 === 0 ? i : size - 1 - i;
      path.push(row * size + col);
    }
  }
  return path;
}

function fullPath(size: number, rng: () => number): number[] {
  for (let i = 0; i < WALK_TRIES; i += 1) {
    const path = attempt(size, rng);
    if (path !== null) return path;
  }
  return snake(size);
}

export interface Puzzle {
  size: number;
  numbers: number[];
  solution: number[];
}

function numbersFrom(size: number, path: readonly number[], marks: Set<number>): number[] {
  const numbers = new Array<number>(size * size).fill(0);
  [...marks]
    .sort((a, b) => a - b)
    .forEach((position, rank) => {
      numbers[path[position] as number] = rank + 1;
    });
  return numbers;
}

/**
 * Saca los números que sobran.
 *
 * La reparación clava uno cada vez que aparece un rival, y termina marcando
 * casi todo el tablero: eso deja de ser un rompecabezas y pasa a ser unir
 * puntos. Acá se prueba a sacar cada uno y se queda solo el que hace falta —
 * el primero y el último nunca, que son el principio y el final.
 */
function thinned(
  size: number,
  path: readonly number[],
  marks: Set<number>,
  rng: () => number,
  keep: number
): number[] {
  const removable = [...marks].filter((position) => position !== 0 && position !== path.length - 1);
  for (let i = removable.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [removable[i], removable[j]] = [removable[j] as number, removable[i] as number];
  }

  for (const position of removable) {
    if (marks.size <= keep) break;
    marks.delete(position);
    // Rendirse cuenta como "no pude demostrarlo": el número se queda.
    const check = countPaths(size, numbersFrom(size, path, marks));
    if (check.exhausted || check.found !== 1) marks.add(position);
  }

  /*
   * Y si quedaron MENOS de los que el nivel pide, se reponen.
   *
   * `keep` es un piso, y hasta acá solo lo era al adelgazar: si la reparación
   * terminaba por debajo, el nivel salía más difícil de lo que pedía. Empezó a
   * pasar al sembrar números antes de reparar —con anclas repartidas parejo
   * hacen falta menos para llegar a único— y se llevaba puesto justo el nivel
   * fácil, que es el que no puede endurecerse.
   *
   * Reponer nunca rompe la unicidad: un número más sobre el mismo recorrido lo
   * sigue admitiendo y solo puede descartar rivales.
   */
  for (let i = 1; i < path.length - 1 && marks.size < keep; i += 1) {
    marks.add(Math.round((i * (path.length - 1)) / keep));
  }

  return numbersFrom(size, path, marks);
}

/**
 * Un tablero sin la exigencia de solución única: recorrido al azar y números
 * repartidos parejo por encima.
 *
 * Sin `countPaths` de por medio no hay búsqueda que pueda dispararse, así que
 * un 8×8 sale en milisegundos donde demostrar unicidad no terminaría nunca. El
 * recorrido generado ES una solución, así que el tablero siempre se puede
 * resolver; lo que no se garantiza es que sea la única, y no hace falta: el
 * motor valida reglas —arranca en el 1, casillas pegadas, sin repetir, números
 * en orden— y se gana al cubrir el tablero.
 *
 * Parejo y no al azar porque los números son las paradas obligatorias: juntos
 * dejan medio tablero sin restricción y el trazo se vuelve un garabato libre.
 */
function spread(size: number, rng: () => number, count: number): Puzzle {
  const path = fullPath(size, rng);

  // El principio y el final siempre; el resto a intervalos iguales.
  const marks = new Set([0, path.length - 1]);
  const steps = Math.max(2, count) - 1;
  for (let i = 1; i < steps; i += 1) {
    marks.add(Math.round((i * (path.length - 1)) / steps));
  }

  return { size, numbers: numbersFrom(size, path, marks), solution: [...path] };
}

/**
 * Dibuja un recorrido y le va clavando números hasta que sea el único posible.
 *
 * El primero y el último son obligatorios: sin ellos el recorrido no tiene ni
 * principio ni final. Los del medio se agregan de a uno, y siempre **donde el
 * recorrido rival se separa del bueno** — clavar un número ahí es exactamente
 * lo que vuelve imposible al rival, así que cada número que se agrega hace
 * falta. Poner números al azar hasta que dé único deja un tablero lleno de
 * pistas que no servían para nada.
 */
export function generatePuzzle(config: TraceConfig, seed?: string): Puzzle {
  const { size } = config;
  const rng = makeRng(seed ?? String(Date.now()));

  if (!config.unique) return spread(size, rng, config.keep);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const path = fullPath(size, rng);

    /*
     * Arrancar con números ya puestos, no desde cero.
     *
     * La reparación agrega UNO y vuelve a resolver el tablero entero, y ese
     * resolver es el 91% del costo. Empezando solo con principio y final hacen
     * falta una docena de rondas, cada una con su resolución completa, para
     * llegar a algo único — y las primeras son las más caras, porque un tablero
     * casi sin restricciones tiene muchísimos caminos que contar.
     *
     * Sembrar unos pocos repartidos parejo salta esa parte cara de una. No
     * arriesga poner de más: lo que sobre lo saca `thinned` después, que es
     * justamente para eso.
     */
    const marks = new Set([0, path.length - 1]);
    for (let i = 1; i < size; i += 1) {
      marks.add(Math.round((i * (path.length - 1)) / size));
    }

    for (let step = 0; step < size * size; step += 1) {
      const numbers = numbersFrom(size, path, marks);
      const { found, samples, exhausted } = countPaths(size, numbers);
      if (exhausted) break;

      if (found === 1)
        return { size, numbers: thinned(size, path, marks, rng, config.keep), solution: [...path] };

      // El rival, no el primero que salga: el buscador puede encontrar el bueno
      // antes que el otro, y compararlo consigo mismo no separa nada.
      const rival = samples.find((candidate) => candidate.some((cell, i) => cell !== path[i]));
      if (rival === undefined) break;

      /*
       * El primer punto libre a partir de donde se separan.
       *
       * Cortar cuando ese punto ya tenía número dejaba el tablero ambiguo: el
       * rival puede separarse justo en un número y volver a juntarse después,
       * y lo que hay que clavar es el primer lugar donde todavía se lo puede
       * obligar.
       */
      const diverge = rival.findIndex((cell, i) => cell !== path[i]);
      if (diverge <= 0) break;

      let spot = diverge;
      while (spot < path.length - 1 && marks.has(spot)) spot += 1;
      if (marks.has(spot)) break;
      marks.add(spot);
    }
  }

  const fallback = fullPath(size, rng);
  return {
    size,
    numbers: numbersFrom(size, fallback, new Set([0, fallback.length - 1])),
    solution: fallback,
  };
}
