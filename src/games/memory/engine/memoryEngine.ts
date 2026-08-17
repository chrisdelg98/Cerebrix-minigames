import { type Difficulty, type GameEngine } from '@core/contract';

import { type MemoryConfig, type MemoryMove, type MemoryState } from './types';

const CONFIGS: Record<Difficulty, MemoryConfig> = {
  1: { cols: 3, rows: 4 },
  2: { cols: 4, rows: 4 },
  3: { cols: 4, rows: 5 },
  4: { cols: 4, rows: 6 },
  5: { cols: 5, rows: 6 },
};

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

function place(index: number, cols: number): string {
  return `fila ${String(Math.floor(index / cols) + 1)}, columna ${String((index % cols) + 1)}`;
}

export const memoryEngine: GameEngine<MemoryState, MemoryMove, MemoryConfig> = {
  getDifficultyConfig(difficulty) {
    return CONFIGS[difficulty];
  },

  createInitialState(config, seed) {
    const rng = makeRng(seed ?? String(Date.now()));
    const total = config.cols * config.rows;
    const symbols: number[] = [];
    for (let i = 0; i < total / 2; i += 1) symbols.push(i, i);

    for (let i = symbols.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j] as number, symbols[i] as number];
    }

    return {
      cols: config.cols,
      rows: config.rows,
      symbols,
      matched: new Array<boolean>(total).fill(false),
      up: [],
      seen: new Array<boolean>(total).fill(false),
    };
  },

  validate(state, move) {
    if (move.kind === 'hide') {
      return state.up.length === 2 ? { ok: true } : { ok: false, reason: 'No hay nada que tapar.' };
    }
    if (move.index < 0 || move.index >= state.symbols.length) {
      return { ok: false, reason: 'Esa carta no existe.' };
    }
    if (state.matched[move.index] === true) {
      return { ok: false, reason: 'Ese par ya está encontrado.' };
    }
    if (state.up.includes(move.index)) {
      return { ok: false, reason: 'Esa carta ya está dada vuelta.' };
    }
    return { ok: true };
  },

  /*
   * Dar vuelta una tercera carta tapa las dos anteriores en el acto.
   *
   * La vista también manda `hide` con un temporizador, pero apoyarse solo en
   * eso obliga a esperar a que termine una animación antes de poder seguir — y
   * en un juego contra reloj, esperar por la interfaz es de lo peor que hay.
   */
  applyMove(state, move) {
    if (move.kind === 'hide') return { ...state, up: [] };

    const up = state.up.length === 2 ? [move.index] : [...state.up, move.index];
    const seen = [...state.seen];
    seen[move.index] = true;

    if (up.length !== 2) return { ...state, up, seen };

    const [a, b] = up as [number, number];
    if (state.symbols[a] !== state.symbols[b]) return { ...state, up, seen };

    const matched = [...state.matched];
    matched[a] = true;
    matched[b] = true;
    return { ...state, up: [], matched, seen };
  },

  checkStatus(state) {
    return state.matched.every(Boolean) ? { kind: 'won' } : { kind: 'playing' };
  },

  getProgress(state) {
    return state.matched.filter(Boolean).length / state.matched.length;
  },

  /**
   * Razona sobre lo que el jugador ya vio, nunca sobre lo que no.
   *
   * Un juego de memoria tiene una pista honesta y una tramposa. La tramposa es
   * "el par de esta carta está allá", que usa información que el jugador no
   * tiene. La honesta es recordarle algo que ya pasó por sus ojos: si entre las
   * cartas destapadas alguna vez hay dos iguales, el par ya lo sabía y solo se
   * le fue de la cabeza. Eso no es adelantarse, es acordarse por él.
   */
  getHint(state) {
    const { cols, symbols, seen, matched, up } = state;

    // Un par entre las que ya vio: se lo recuerda.
    const bySymbol = new Map<number, number[]>();
    for (let i = 0; i < symbols.length; i += 1) {
      if (seen[i] !== true || matched[i] === true) continue;
      const symbol = symbols[i] as number;
      bySymbol.set(symbol, [...(bySymbol.get(symbol) ?? []), i]);
    }

    for (const [, positions] of bySymbol) {
      if (positions.length < 2) continue;
      const [a, b] = positions as [number, number];
      return {
        cells: [
          { row: Math.floor(a / cols), col: a % cols },
          { row: Math.floor(b / cols), col: b % cols },
        ],
        message: `Estas dos ya las destapaste antes y son iguales: ${place(a, cols)} y ${place(b, cols)}. El par ya lo tenías.`,
      };
    }

    // Una carta suelta que ya vio, y todavía sin pareja conocida.
    const alone = [...bySymbol.entries()].find(([, positions]) => positions.length === 1);
    const unseen = symbols.filter((_, i) => seen[i] !== true && matched[i] !== true).length;

    if (alone !== undefined && unseen > 0) {
      const index = alone[1][0] as number;
      return {
        cells: [{ row: Math.floor(index / cols), col: index % cols }],
        message: `Esta ya la viste y su par sigue escondido. Quedan ${String(unseen)} cartas sin destapar: probá una de esas antes que repetir una conocida.`,
      };
    }

    if (up.length === 1) {
      const index = up[0] as number;
      return {
        cells: [{ row: Math.floor(index / cols), col: index % cols }],
        message:
          'Todavía no destapaste nada que se repita. Cada carta nueva vale doble: te acerca al par y te dice dónde no está.',
      };
    }

    return null;
  },

  serialize(state) {
    return JSON.stringify({
      cols: state.cols,
      rows: state.rows,
      symbols: state.symbols,
      matched: state.matched.map((yes) => (yes ? '1' : '0')).join(''),
      seen: state.seen.map((yes) => (yes ? '1' : '0')).join(''),
    });
  },

  deserialize(raw) {
    const saved = JSON.parse(raw) as {
      cols: number;
      rows: number;
      symbols: number[];
      matched: string;
      seen: string;
    };
    return {
      cols: saved.cols,
      rows: saved.rows,
      symbols: saved.symbols,
      matched: [...saved.matched].map((char) => char === '1'),
      seen: [...saved.seen].map((char) => char === '1'),
      // Las que estaban boca arriba no se guardan: reanudar con dos cartas a la
      // vista sería regalarlas.
      up: [],
    };
  },
};
