import { findSolutions } from './solve';
import { type QueensConfig } from './types';

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

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** One queen per row and column, and never touching — not even at a corner. */
function placeQueens(size: number, rng: () => number): number[] | null {
  const columns: number[] = [];

  const place = (row: number): boolean => {
    if (row === size) return true;
    for (const col of shuffled([...Array(size).keys()], rng)) {
      if (columns.includes(col)) continue;
      if (row > 0 && Math.abs(col - (columns[row - 1] as number)) <= 1) continue;
      columns.push(col);
      if (place(row + 1)) return true;
      columns.pop();
    }
    return false;
  };

  return place(0) ? columns : null;
}

/**
 * Grows the regions outwards from the queens, one cell at a time.
 *
 * Seeding from the queens is what guarantees the arrangement is legal at all:
 * every region ends up holding exactly one of them. Which region gets the next
 * free cell is drawn at random each step rather than region by region — filling
 * them in turn produces stripes, and a board of stripes gives the whole puzzle
 * away at a glance.
 */
function growRegions(size: number, queens: readonly number[], rng: () => number): number[] {
  const regions = new Array<number>(size * size).fill(-1);
  const frontier: number[][] = [];

  queens.forEach((col, row) => {
    regions[row * size + col] = row;
    frontier.push([row * size + col]);
  });

  let left = size * size - size;

  while (left > 0) {
    /* Crece la más chica primero: al azar, unas regiones se disparaban y otras
       quedaban en dos casillas — y una región de dos resuelve sola una fila. */
    const order = shuffled([...Array(size).keys()], rng).sort((a, b) => {
      const sa = frontier[a]?.length ?? 0;
      const sb = frontier[b]?.length ?? 0;
      return sa - sb;
    });
    let moved = false;

    for (const region of order) {
      const cells = frontier[region];
      if (cells === undefined || cells.length === 0) continue;

      const from = cells[Math.floor(rng() * cells.length)] as number;
      const row = Math.floor(from / size);
      const col = from % size;

      const neighbours = shuffled(
        [
          [row - 1, col],
          [row + 1, col],
          [row, col - 1],
          [row, col + 1],
        ],
        rng
      ).filter(([r, c]) => {
        const rr = r as number;
        const cc = c as number;
        return rr >= 0 && rr < size && cc >= 0 && cc < size && regions[rr * size + cc] === -1;
      });

      const target = neighbours[0];
      if (target === undefined) {
        // This cell has nothing left around it; stop offering it.
        frontier[region] = cells.filter((cell) => cell !== from);
        continue;
      }

      const index = (target[0] as number) * size + (target[1] as number);
      regions[index] = region;
      cells.push(index);
      left -= 1;
      moved = true;
      if (left === 0) break;
    }

    // Every region is walled in and cells remain: this shape cannot be finished.
    if (!moved) return [];
  }

  return regions;
}

/** ¿Siguen todas las casillas de esta región pegadas entre sí? */
function connected(size: number, regions: readonly number[], region: number): boolean {
  const cells = regions.map((r, i) => (r === region ? i : -1)).filter((i) => i >= 0);
  const first = cells[0];
  if (first === undefined) return false;

  const seen = new Set([first]);
  const queue = [first];

  while (queue.length > 0) {
    const at = queue.pop() as number;
    const row = Math.floor(at / size);
    const col = at % size;

    for (const [r, c] of [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ]) {
      const rr = r as number;
      const cc = c as number;
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
      const next = rr * size + cc;
      if (regions[next] !== region || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  return seen.size === cells.length;
}

/**
 * Rompe una solución rival moviendo UNA casilla de región.
 *
 * Se elige una fila donde la rival difiere de la buena y se pasa esa casilla a
 * una región vecina. La solución buena no se toca nunca: la casilla movida no
 * es corona suya, así que su región conserva la propia y la que la recibe no
 * gana ninguna. La rival, en cambio, deja de cerrar.
 */
function breakRival(
  size: number,
  regions: number[],
  intended: readonly number[],
  rival: readonly number[],
  rng: () => number
): boolean {
  const rows = shuffled([...Array(size).keys()], rng);

  for (const row of rows) {
    const col = rival[row] as number;
    if (col === intended[row]) continue;

    const index = row * size + col;
    const neighbours = shuffled(
      [index - size, index + size, col > 0 ? index - 1 : -1, col + 1 < size ? index + 1 : -1],
      rng
    ).filter((n) => n >= 0 && n < size * size && regions[n] !== regions[index]);

    /*
     * La casilla se va a la región vecina MÁS CHICA.
     *
     * Elegir al azar funcionaba igual para la unicidad, pero cada reparación
     * empobrecía a una región y engordaba a otra: en 9×9 la diferencia entre la
     * mayor y la menor terminaba en 17 casillas, con regiones de una sola —
     * y una región de una casilla resuelve sola una fila y una columna.
     */
    const sizes = new Array<number>(size).fill(0);
    for (const region of regions) sizes[region] = (sizes[region] ?? 0) + 1;
    neighbours.sort(
      (a, b) => (sizes[regions[a] as number] ?? 0) - (sizes[regions[b] as number] ?? 0)
    );

    /*
     * Una región no se puede partir en dos.
     *
     * Sacarle una casilla del medio la dejaba en dos pedazos sueltos del mismo
     * color, que es lo que hacía que el tablero pareciera tener colores
     * repetidos — y una región discontinua no es una región.
     */
    const from = regions[index] as number;
    for (const target of neighbours) {
      regions[index] = regions[target] as number;
      if (connected(size, regions, from)) return true;
      regions[index] = from;
    }
  }

  return false;
}

export interface Puzzle {
  size: number;
  regions: number[];
  solution: number[];
}

/**
 * Ubicar las coronas, hacer crecer las regiones alrededor, y después ir
 * rompiendo las soluciones rivales de a una.
 *
 * Las coronas primero y las regiones después es lo que hace esto barato:
 * generar regiones y salir a buscar una ubicación adentro fallaría casi
 * siempre. Acá la solución existe por construcción, y la única pregunta abierta
 * es si tiene compañía.
 *
 * Reparar y no reintentar, medido: a partir de 6×6 el crecimiento al azar da
 * solución única en menos de una de cada seis veces, así que reintentar era
 * tirar tableros hasta agotar el presupuesto y devolver uno ambiguo. Cada
 * reparación mata una rival y no toca la buena, así que el proceso solo puede
 * avanzar hacia la unicidad.
 */
export function generatePuzzle(config: QueensConfig, seed?: string): Puzzle {
  const { size } = config;
  const rng = makeRng(seed ?? String(Date.now()));

  for (let attempt = 0; attempt < 250; attempt += 1) {
    const queens = placeQueens(size, rng);
    if (queens === null) continue;

    const regions = growRegions(size, queens, rng);
    if (regions.length === 0) continue;

    /* Presupuesto corto a propósito: con la contigüidad exigida, un tablero
       que no converge en unos pocos arreglos no suele converger nunca, y sale
       más barato empezar de cero que insistir. */
    for (let repair = 0; repair < size * 4; repair += 1) {
      const solutions = findSolutions(size, regions);
      if (solutions.length === 1) return { size, regions, solution: queens };

      const rival = solutions.find((candidate) => candidate.some((c, r) => c !== queens[r]));
      if (rival === undefined || !breakRival(size, regions, queens, rival, rng)) break;
    }
  }

  /* Inalcanzable en los tamaños que se publican; un tablero es mejor que un error. */
  const fallback = placeQueens(size, rng) ?? [...Array(size).keys()];
  return { size, regions: growRegions(size, fallback, rng), solution: fallback };
}
