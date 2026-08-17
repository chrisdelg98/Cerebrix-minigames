import { EMPTY, MOON, SIZE, SUN, type Constraint, type Value } from './types';

/** One step of reasoning: what it concluded, and the rule that got it there. */
export interface Deduction {
  index: number;
  value: Value;
  why: string;
}

const flip = (value: Value | undefined): Value => (value === SUN ? MOON : SUN);
const one = (value: Value | undefined): string => (value === SUN ? 'un sol' : 'una luna');
const many = (value: Value | undefined): string => (value === SUN ? 'soles' : 'lunas');

interface Line {
  cells: number[];
  label: string;
}

/** The twelve lines of the board, named the way a player would name them. */
const LINES: Line[] = (() => {
  const out: Line[] = [];
  for (let i = 0; i < SIZE; i += 1) {
    const row: number[] = [];
    const col: number[] = [];
    for (let k = 0; k < SIZE; k += 1) {
      row.push(i * SIZE + k);
      col.push(k * SIZE + i);
    }
    out.push({ cells: row, label: `la fila ${String(i + 1)}` });
    out.push({ cells: col, label: `la columna ${String(i + 1)}` });
  }
  return out;
})();

/**
 * La primera regla que este tablero rompe, dicha con nombre y lugar.
 *
 * Devuelve el texto y no un booleano a propósito: cuando se razona por
 * contradicción, «se rompe» no le sirve a nadie. Lo que hace falta saber es qué
 * quedó mal y en qué línea, que es algo que se ve en el tablero — no algo que
 * haya que saber de antemano.
 */
export function conflict(
  values: readonly Value[],
  constraints: readonly Constraint[]
): string | null {
  for (const { cells, label } of LINES) {
    let suns = 0;
    let moons = 0;

    for (let k = 0; k < SIZE; k += 1) {
      const value = values[cells[k] as number];
      if (value === SUN) suns += 1;
      if (value === MOON) moons += 1;

      if (k >= 2 && value !== EMPTY) {
        if (value === values[cells[k - 1] as number] && value === values[cells[k - 2] as number]) {
          return `${label} queda con tres ${many(value)} seguidos`;
        }
      }
    }

    if (suns > SIZE / 2) return `${label} queda con ${String(suns)} soles, y solo pueden ir tres`;
    if (moons > SIZE / 2) return `${label} queda con ${String(moons)} lunas, y solo pueden ir tres`;
  }

  for (const { i, j, same } of constraints) {
    const a = values[i];
    const b = values[j];
    if (a === EMPTY || b === EMPTY) continue;
    if ((a === b) !== same) {
      return same
        ? 'un signo = queda entre dos casillas distintas'
        : 'un signo × queda entre dos casillas iguales';
    }
  }

  return null;
}

/**
 * The next thing the board says out loud, in order of how obvious it is.
 *
 * Ordered on purpose: the first rule that fires is the one the hint quotes, so
 * a player who asks for help gets the easiest available step rather than the
 * cleverest one.
 */
export function directStep(
  values: readonly Value[],
  constraints: readonly Constraint[]
): Deduction | null {
  // 1 — a sign next to something already decided.
  for (const { i, j, same } of constraints) {
    const a = values[i];
    const b = values[j];
    const sign = same ? '=' : '×';
    const verb = same ? 'del mismo tipo' : 'de distinto tipo';

    if (a !== EMPTY && b === EMPTY) {
      const value: Value = same ? (a as Value) : flip(a);
      return {
        index: j,
        value,
        why: `El signo ${sign} obliga a que las dos casillas sean ${verb}, y al lado ya hay ${one(a)}: acá va ${one(value)}.`,
      };
    }
    if (b !== EMPTY && a === EMPTY) {
      const value: Value = same ? (b as Value) : flip(b);
      return {
        index: i,
        value,
        why: `El signo ${sign} obliga a que las dos casillas sean ${verb}, y al lado ya hay ${one(b)}: acá va ${one(value)}.`,
      };
    }
  }

  for (const { cells, label } of LINES) {
    // 2 — two the same in a row: whatever touches them has to break the pair.
    for (let k = 0; k + 1 < SIZE; k += 1) {
      const a = values[cells[k] as number];
      if (a === EMPTY || a !== values[cells[k + 1] as number]) continue;

      for (const edge of [k - 1, k + 2]) {
        if (edge < 0 || edge >= SIZE) continue;
        const index = cells[edge] as number;
        if (values[index] !== EMPTY) continue;
        return {
          index,
          value: flip(a),
          why: `No puede haber tres iguales seguidos, y en ${label} ya hay dos ${many(a)} pegados: acá va ${one(flip(a))}.`,
        };
      }
    }

    // 3 — the sandwich: two the same with one gap between them.
    for (let k = 0; k + 2 < SIZE; k += 1) {
      const a = values[cells[k] as number];
      const middle = cells[k + 1] as number;
      if (a === EMPTY || values[middle] !== EMPTY || a !== values[cells[k + 2] as number]) continue;
      return {
        index: middle,
        value: flip(a),
        why: `Si acá fuera ${one(a)} quedarían tres ${many(a)} seguidos en ${label}: va ${one(flip(a))}.`,
      };
    }

    // 4 — the line already has its three, so the rest is settled.
    for (const symbol of [SUN, MOON] as const) {
      const count = cells.filter((index) => values[index] === symbol).length;
      if (count !== SIZE / 2) continue;
      const index = cells.find((cell) => values[cell] === EMPTY);
      if (index === undefined) continue;
      return {
        index,
        value: flip(symbol),
        why: `${label.charAt(0).toUpperCase()}${label.slice(1)} ya tiene sus tres ${many(symbol)}: lo que queda son todas ${many(flip(symbol))}.`,
      };
    }
  }

  return null;
}

/**
 * Aplica `directStep` hasta que el tablero se queda callado.
 *
 * Si en el camino algo se rompe, devuelve la regla rota en vez de un fracaso
 * mudo: es lo que la pista por contradicción necesita citar.
 */
export function propagate(
  start: readonly Value[],
  constraints: readonly Constraint[]
): { values: Value[] } | { broke: string } {
  const values = [...start];

  for (;;) {
    const broken = conflict(values, constraints);
    if (broken !== null) return { broke: broken };

    const move = directStep(values, constraints);
    if (move === null) return { values };
    values[move.index] = move.value;
  }
}

/**
 * The harder tier: assume a symbol, follow the obvious rules, and if the board
 * falls apart then the other symbol was forced all along.
 *
 * This is the line between the easy levels and the hard ones. Everything above
 * can be read straight off the board; this one has to be tried out in your head
 * first, which is a different kind of thinking and the reason the top levels
 * take real work.
 */
export function contradictionStep(
  values: readonly Value[],
  constraints: readonly Constraint[]
): Deduction | null {
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] !== EMPTY) continue;

    for (const candidate of [SUN, MOON] as const) {
      const trial = [...values];
      trial[index] = candidate;
      const outcome = propagate(trial, constraints);
      if (!('broke' in outcome)) continue;

      return {
        index,
        value: flip(candidate),
        why: `Probá ${one(candidate)} acá y seguí las reglas: ${outcome.broke}. Así que va ${one(flip(candidate))}.`,
      };
    }
  }

  return null;
}

export function nextStep(
  values: readonly Value[],
  constraints: readonly Constraint[],
  allowContradiction: boolean
): Deduction | null {
  return (
    directStep(values, constraints) ??
    (allowContradiction ? contradictionStep(values, constraints) : null)
  );
}

/**
 * Can this board be finished with the rules this level allows?
 *
 * Note there is no separate uniqueness check anywhere in the generator: every
 * rule here is sound, so a board that fills up by following them has exactly
 * one solution by construction. Cheaper than counting, and a stronger promise —
 * unique is not the same as findable, and this is findable.
 */
export function solvable(
  start: readonly Value[],
  constraints: readonly Constraint[],
  allowContradiction: boolean
): boolean {
  const values = [...start];

  for (;;) {
    if (!values.includes(EMPTY)) return true;
    const move = nextStep(values, constraints, allowContradiction);
    if (move === null) return false;
    values[move.index] = move.value;
  }
}
