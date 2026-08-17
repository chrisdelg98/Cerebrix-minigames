import { solvable } from './deduce';
import { ROWS } from './solve';
import { EMPTY, SIZE, SUN, type Constraint, type TangoConfig, type Value } from './types';

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

/** A finished board: rows picked at random, backtracking when the columns fail. */
function fullGrid(rng: () => number): Value[] {
  const grid: Value[][] = [];
  const suns = new Array<number>(SIZE).fill(0);

  const ok = (row: number, candidate: Value[]): boolean => {
    for (let c = 0; c < SIZE; c += 1) {
      if (candidate[c] === grid[row - 1]?.[c] && candidate[c] === grid[row - 2]?.[c]) return false;
      const count = (suns[c] ?? 0) + (candidate[c] === SUN ? 1 : 0);
      if (count > SIZE / 2 || count + (SIZE - row - 1) < SIZE / 2) return false;
    }
    return true;
  };

  const place = (row: number): boolean => {
    if (row === SIZE) return true;
    for (const candidate of shuffled(ROWS, rng)) {
      if (!ok(row, candidate)) continue;
      grid[row] = candidate;
      for (let c = 0; c < SIZE; c += 1) if (candidate[c] === SUN) suns[c] = (suns[c] ?? 0) + 1;
      if (place(row + 1)) return true;
      for (let c = 0; c < SIZE; c += 1) if (candidate[c] === SUN) suns[c] = (suns[c] ?? 0) - 1;
    }
    return false;
  };

  place(0);
  return grid.flat();
}

export interface Puzzle {
  values: Value[];
  given: boolean[];
  constraints: Constraint[];
  solution: Value[];
}

/**
 * Draw a finished board, hang some signs off it, then take away everything the
 * board can do without.
 *
 * Lo que decide si algo se saca no es la unicidad sino si el tablero SE SIGUE
 * PUDIENDO RESOLVER con las reglas del nivel. Únicas hay muchas que igual
 * obligan a tantear; acá cada casilla que queda sostiene un paso que se puede
 * ver. Los signos se adelgazan al final, así los niveles duros se apoyan en
 * ellos y no en símbolos regalados.
 */
export function generatePuzzle(config: TangoConfig, seed?: string): Puzzle {
  const rng = makeRng(seed ?? String(Date.now()));
  const solution = fullGrid(rng);

  const pairs: [number, number][] = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const i = r * SIZE + c;
      if (c + 1 < SIZE) pairs.push([i, i + 1]);
      if (r + 1 < SIZE) pairs.push([i, i + SIZE]);
    }
  }

  let constraints: Constraint[] = shuffled(pairs, rng)
    .slice(0, config.signs)
    .map(([i, j]) => ({ i, j, same: solution[i] === solution[j] }));

  const given = new Array<boolean>(SIZE * SIZE).fill(true);
  const board = (): Value[] =>
    solution.map((value, i) => (given[i] === true ? value : (EMPTY as Value)));

  let count = given.length;
  for (const index of shuffled([...given.keys()], rng)) {
    if (count <= config.keep) break;
    given[index] = false;
    count -= 1;
    if (!solvable(board(), constraints, config.allowContradiction)) {
      given[index] = true;
      count += 1;
    }
  }

  /*
   * Los niveles fáciles conservan sus signos.
   *
   * Con el piso de casillas puesto el tablero queda sobredeterminado, así que
   * casi todo signo resulta redundante y el adelgazado los barría — y el signo
   * es justo lo que hace evidente el paso siguiente, además de ser la cara del
   * juego. Solo se adelgazan donde el tablero sí se pela.
   */
  for (const constraint of config.keep > 0 ? [] : shuffled(constraints, rng)) {
    const without = constraints.filter((other) => other !== constraint);
    const before = constraints;
    constraints = without;
    if (!solvable(board(), constraints, config.allowContradiction)) constraints = before;
  }

  return { values: board(), given, constraints, solution };
}
