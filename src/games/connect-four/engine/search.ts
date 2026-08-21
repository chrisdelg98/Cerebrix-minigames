import { type Board, type ConnectFourConfig, type Disc, COLS, ROWS } from './types';

/**
 * Las 69 ventanas de cuatro casillas en línea que existen en el tablero.
 *
 * Se calculan una vez y se recorren enteras tanto para detectar la victoria
 * como para puntuar una posición. Enumerarlas de antemano evita repetir la
 * aritmética de bordes en el corazón de la búsqueda, que es el único lugar del
 * juego donde el rendimiento importa.
 */
export const WINDOWS: readonly (readonly number[])[] = (() => {
  const out: number[][] = [];
  const at = (row: number, col: number): number => row * COLS + col;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (col + 3 < COLS)
        out.push([at(row, col), at(row, col + 1), at(row, col + 2), at(row, col + 3)]);
      if (row + 3 < ROWS)
        out.push([at(row, col), at(row + 1, col), at(row + 2, col), at(row + 3, col)]);
      if (col + 3 < COLS && row + 3 < ROWS) {
        out.push([at(row, col), at(row + 1, col + 1), at(row + 2, col + 2), at(row + 3, col + 3)]);
      }
      if (col - 3 >= 0 && row + 3 < ROWS) {
        out.push([at(row, col), at(row + 1, col - 1), at(row + 2, col - 2), at(row + 3, col - 3)]);
      }
    }
  }
  return out;
})();

/**
 * Las mismas ventanas, aplanadas en un arreglo tipado.
 *
 * Es la estructura que recorre la evaluación, que se llama en cada hoja de la
 * búsqueda. Un arreglo de arreglos obliga a una indirección por ventana y
 * guarda números como objetos; aplanado en `Int16Array` son lecturas seguidas
 * de enteros. Junto con representar las fichas como 1 y 2 en vez de 'red' y
 * 'yellow' —comparar cadenas en el bucle más caliente era el verdadero costo—
 * la búsqueda pasó de 156 a varios cientos de nodos por milisegundo.
 */
const FLAT = (() => {
  const flat = new Int16Array(WINDOWS.length * 4);
  WINDOWS.forEach((w, i) => {
    for (let k = 0; k < 4; k += 1) flat[i * 4 + k] = w[k] as number;
  });
  return flat;
})();

const ME = 1;
const RIVAL = 2;

export function winningLine(board: Board): number[] | null {
  for (const window of WINDOWS) {
    const first = board[window[0] as number];
    if (first === null || first === undefined) continue;
    if (window.every((cell) => board[cell] === first)) return [...window];
  }
  return null;
}

/** La fila donde caería una ficha en esa columna, o -1 si está llena. */
export function landing(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row * COLS + col] === null) return row;
  }
  return -1;
}

export function openColumns(board: Board): number[] {
  const out: number[] = [];
  for (let col = 0; col < COLS; col += 1) if (landing(board, col) >= 0) out.push(col);
  return out;
}

export const other = (disc: Disc): Disc => (disc === 'red' ? 'yellow' : 'red');

export function drop(board: Board, col: number, disc: Disc): Board {
  const row = landing(board, col);
  if (row < 0) return board;
  const next = board.slice();
  next[row * COLS + col] = disc;
  return next;
}

/**
 * El centro primero.
 *
 * No es una preferencia estética: por el centro pasan más ventanas de cuatro
 * que por ningún otro lado, así que ahí suelen estar las mejores jugadas. Y
 * probar primero la mejor es lo que le da de comer a la poda — con este orden
 * la búsqueda a profundidad 8 recorre una fracción de lo que recorrería
 * empezando por la izquierda.
 */
const ORDER = [3, 2, 4, 1, 5, 0, 6];

const WIN = 100_000;

/**
 * Cuánto vale una posición para `me`, sin mirar más adelante.
 *
 * Cuenta ventanas: tres fichas propias con un hueco vale mucho, dos con dos
 * huecos vale poco, y lo mismo del rival resta. Las del rival pesan un poco más
 * que las propias para que prefiera tapar antes que construir — una amenaza que
 * se ignora te cuesta la partida, una que no construís solo te cuesta tiempo.
 */
function evaluate(cells: Int8Array): number {
  let score = 0;

  for (let w = 0; w < FLAT.length; w += 4) {
    let mine = 0;
    let theirs = 0;
    for (let k = 0; k < 4; k += 1) {
      const disc = cells[FLAT[w + k] as number] as number;
      if (disc === ME) mine += 1;
      else if (disc === RIVAL) theirs += 1;
    }
    if (mine > 0 && theirs > 0) continue;

    if (mine === 3) score += 50;
    else if (mine === 2) score += 5;
    else if (theirs === 3) score -= 70;
    else if (theirs === 2) score -= 7;
  }

  // La columna del centro, por lo mismo que ORDER: pasa más juego por ahí.
  for (let row = 0; row < ROWS; row += 1) {
    const disc = cells[row * COLS + 3] as number;
    if (disc === ME) score += 6;
    else if (disc === RIVAL) score -= 6;
  }

  return score;
}

/**
 * Techo de nodos, y la razón de que la búsqueda sea iterativa.
 *
 * Esto corre en el hilo principal, así que una posición que se dispare congela
 * la pantalla — ya sabemos cómo se ve eso. Pero cortar una búsqueda profunda a
 * la mitad es peor que no haberla hecho: devuelve columnas medio miradas, unas
 * con ocho jugadas de análisis y otras con dos, y compararlas entre sí no
 * significa nada.
 *
 * Por eso se busca a profundidad 1, después a 2, y así hasta donde el nivel
 * permita o el presupuesto aguante, quedándose siempre con la última pasada
 * COMPLETA. Repetir el trabajo de las capas de arriba suena a desperdicio y no
 * lo es: cada capa cuesta una fracción de la siguiente.
 */
const NODE_BUDGET = 120_000;

/** Las cuatro direcciones de una línea: horizontal, vertical y las dos diagonales. */
const DIRS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/**
 * El tablero de la búsqueda: mutable, con las alturas al día.
 *
 * La primera versión copiaba el arreglo de 42 en cada nodo y buscaba la línea
 * ganadora recorriendo las 69 ventanas enteras. A profundidad 8 eso daba 873 ms
 * por jugada — casi un segundo de pantalla congelada, y en un teléfono el
 * triple. Poner y sacar la ficha sobre el mismo arreglo, y mirar solo las
 * líneas que PASAN POR la casilla recién puesta, es la misma búsqueda con una
 * fracción del trabajo.
 */
interface Search {
  board: Int8Array;
  /** Cuántas fichas tiene cada columna. Evita rastrear la fila libre. */
  heights: number[];
  nodes: number;
  /** Si ESTA pasada tuvo que cortar por presupuesto. Se reinicia en cada una. */
  truncada: boolean;
}

function place(search: Search, col: number, disc: number): number {
  const row = ROWS - 1 - (search.heights[col] as number);
  const cell = row * COLS + col;
  search.board[cell] = disc;
  search.heights[col] = (search.heights[col] as number) + 1;
  return cell;
}

function unplace(search: Search, col: number): void {
  search.heights[col] = (search.heights[col] as number) - 1;
  const row = ROWS - 1 - search.heights[col];
  search.board[row * COLS + col] = 0;
}

/**
 * Si la ficha recién puesta cerró una línea de cuatro.
 *
 * Solo mira hacia los dos lados desde esa casilla, en las cuatro direcciones.
 * Una ficha que no se acaba de poner no puede haber creado una línea nueva, así
 * que revisar el tablero entero era trabajo tirado en cada uno de los nodos.
 */
function closes(search: Search, cell: number, disc: number): boolean {
  const row = Math.floor(cell / COLS);
  const col = cell % COLS;

  for (const [dr, dc] of DIRS) {
    let run = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && search.board[r * COLS + c] === disc) {
        run += 1;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (run >= 4) return true;
  }
  return false;
}

function negamax(search: Search, depth: number, alpha: number, beta: number, turn: number): number {
  // Cortar de una: agotado el presupuesto, seguir recorriendo el árbol para
  // evaluar cada nodo cuesta MÁS que la búsqueda normal, y el resultado se
  // descarta igual. Medido, esa versión tardaba 589 ms en devolver la respuesta
  // de una pasada mucho más corta.
  if (search.truncada) return 0;

  search.nodes += 1;
  if (search.nodes > NODE_BUDGET) {
    search.truncada = true;
    return 0;
  }
  if (depth === 0) return evaluate(search.board);

  const maximising = turn === ME;
  let best = maximising ? -Infinity : Infinity;
  let a = alpha;
  let b = beta;
  let jugadas = 0;

  for (const col of ORDER) {
    if (search.truncada) break;
    if ((search.heights[col] as number) >= ROWS) continue;
    jugadas += 1;

    const cell = place(search, col, turn);
    /*
     * Ganar YA vale más que ganar dentro de seis jugadas, y perder tarde es
     * menos malo que perder ya. Sin esto una máquina que se sabe perdida juega
     * cualquier cosa, y desde afuera parece que se rindió.
     *
     * `depth` es lo que FALTA por mirar, así que decrece al bajar: cuanto antes
     * el desenlace, más grande. De ahí que se sume y no se reste — al revés
     * (como en el tres en línea, donde la profundidad contaba para arriba) la
     * máquina prefiere ganar lo más tarde posible, y juega tan mal que el nivel
     * 4 perdía todas las partidas contra un rival de instinto.
     */
    const value = closes(search, cell, turn)
      ? turn === ME
        ? WIN + depth
        : -WIN - depth
      : negamax(search, depth - 1, a, b, turn === ME ? RIVAL : ME);
    unplace(search, col);

    if (maximising) {
      if (value > best) best = value;
      if (best > a) a = best;
    } else {
      if (value < best) best = value;
      if (best < b) b = best;
    }
    if (b <= a) break;
  }

  return jugadas === 0 ? 0 : best;
}

/** El tablero público (cadenas) al de la búsqueda (números), visto desde `me`. */
function encode(board: Board, me: Disc): Int8Array {
  const cells = new Int8Array(COLS * ROWS);
  for (let i = 0; i < cells.length; i += 1) {
    const disc = board[i];
    cells[i] = disc === undefined || disc === null ? 0 : disc === me ? ME : RIVAL;
  }
  return cells;
}

function heightsOf(board: Board): number[] {
  const heights: number[] = [];
  for (let col = 0; col < COLS; col += 1) {
    let n = 0;
    for (let row = ROWS - 1; row >= 0; row -= 1) if (board[row * COLS + col] !== null) n += 1;
    heights.push(n);
  }
  return heights;
}

/** Las columnas ordenadas de mejor a peor para `me`, con su valor. */
export function ranked(board: Board, me: Disc, depth: number): { column: number; value: number }[] {
  const search: Search = {
    board: encode(board, me),
    heights: heightsOf(board),
    nodes: 0,
    truncada: false,
  };
  const open = openColumns(board);
  let completa: { column: number; value: number }[] = open.map((column) => ({ column, value: 0 }));

  /*
   * De dos en dos, y siempre impares.
   *
   * Una búsqueda que termina justo después de la jugada propia y otra que
   * termina después de la del rival sesgan la evaluación distinto — es el
   * efecto de paridad, y acá no es sutil: medido contra una referencia fija,
   * profundidad 6 perdía 6-3 mientras que 5 ganaba 7-0 y 7 ganaba 7-1. Las
   * pares juegan peor que la impar de abajo.
   *
   * Yendo de dos en dos todas las pasadas son impares, así que la escala no se
   * puede invertir por paridad y, cuando el presupuesto obliga a quedarse con
   * la pasada anterior, esa también es impar.
   */
  for (let d = 1; d <= depth; d += 2) {
    search.truncada = false;
    const pasada = open.map((column) => {
      const cell = place(search, column, ME);
      // Una victoria inmediata es la más pronta que existe: tiene que ganarle
      // a cualquier victoria encontrada más abajo.
      const value = closes(search, cell, ME)
        ? WIN + COLS * ROWS
        : negamax(search, d - 1, -Infinity, Infinity, RIVAL);
      unplace(search, column);
      return { column, value };
    });

    /*
     * Se descarta solo la pasada que ELLA MISMA tuvo que cortar: sus columnas
     * no se miraron todas igual de hondo y compararlas entre sí no significa
     * nada. Una pasada que terminó entera se queda, aunque el gasto acumulado
     * ya haya cruzado el techo — mirarla y tirarla sería pagar el trabajo dos
     * veces para no usarlo.
     */
    if (search.truncada && d > 1) break;
    completa = pasada;
    if (search.truncada || search.nodes > NODE_BUDGET) break;
  }

  return completa.sort((x, y) => y.value - x.value);
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function randomAt(seed: string, step: number): number {
  let a = hash(`${seed}#${String(step)}`);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Cuántas jugadas mira SIEMPRE la máquina, en todos los niveles.
 *
 * Cinco y no más, y no es pereza: medido, profundidad 7 no juega mejor que 5
 * —cinco a cinco en veinte partidas— y 9 sí juega mejor pero tarda 5,3 segundos
 * por jugada. Con este evaluador el techo útil es 5, y ahí una jugada cuesta
 * unos 20 ms.
 */
export const DEPTH = 5;

/**
 * Qué juega la máquina.
 *
 * Un algoritmo y una moneda, igual que el tres en línea: siempre calcula la
 * mejor columna a profundidad 5 y lo que cambia entre niveles es cuánto se
 * permite no jugarla. Una sola palanca, que es lo que impide que la escala se
 * invierta.
 *
 * La diferencia con el tres en línea es el nivel 5: **acá vale 1 y nunca se
 * deja llevar**. Allá era imposible que no lo hiciera, porque el juego está
 * resuelto. Acá la profundidad es un límite honesto y ganarle es verlo venir
 * antes que él.
 */
export function machineMove(
  board: Board,
  me: Disc,
  config: ConnectFourConfig,
  seed: string,
  ply: number
): number {
  const options = ranked(board, me, DEPTH);
  const best = options[0];
  if (best === undefined) return -1;

  /* El desliz: la segunda mejor, no una al azar. Una ficha tirada en una
     columna cualquiera no se lee como un rival flojo sino como uno que no está
     jugando. */
  if (randomAt(seed, ply + 7000) > config.sharpness && options.length > 1) {
    return options[1]?.column ?? best.column;
  }

  /* Entre columnas que valen lo mismo, la semilla decide. Sin esto la máquina
     abre siempre igual y a la tercera partida se repite una secuencia
     memorizada en vez de jugarse una partida. */
  const tied = options.filter((one) => one.value === best.value);
  return tied[Math.floor(randomAt(seed, ply) * tied.length)]?.column ?? best.column;
}
