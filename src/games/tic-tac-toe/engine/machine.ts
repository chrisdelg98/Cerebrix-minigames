import { type Board, type Mark, type TicTacToeConfig } from './types';

/** Las ocho líneas que ganan. Se recorren enteras; son ocho. */
export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function winningLine(board: Board): number[] | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    const first = board[a];
    if (first !== null && first !== undefined && first === board[b] && first === board[c]) {
      return [a, b, c];
    }
  }
  return null;
}

export function freeCells(board: Board): number[] {
  const free: number[] = [];
  for (let i = 0; i < board.length; i += 1) if (board[i] === null) free.push(i);
  return free;
}

export const other = (mark: Mark): Mark => (mark === 'x' ? 'o' : 'x');

function put(board: Board, cell: number, mark: Mark): Board {
  const next = board.slice();
  next[cell] = mark;
  return next;
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** El azar de una jugada concreta, como función de (semilla, número de jugada). */
function randomAt(seed: string, step: number): number {
  let a = hash(`${seed}#${String(step)}`);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Minimax completo. Devuelve el valor de la posición para `me`.
 *
 * Sin poda ni memoria: el árbol entero del tres en línea son 9! ≈ 362 880
 * caminos en el peor caso —la primera jugada— y se recorre en microsegundos.
 * Podarlo sería optimizar algo que ya no se siente, a cambio de código que hay
 * que entender. En Conecta 4 la respuesta sería la contraria.
 *
 * La profundidad entra en el puntaje para que prefiera ganar YA y perder TARDE:
 * sin eso, una máquina que ya perdió juega cualquier cosa, y desde afuera se ve
 * como que se rindió.
 */
function score(board: Board, me: Mark, turn: Mark, depth: number): number {
  const line = winningLine(board);
  if (line !== null) {
    const winner = board[line[0] ?? 0];
    return winner === me ? 10 - depth : depth - 10;
  }

  const free = freeCells(board);
  if (free.length === 0) return 0;

  const values = free.map((cell) => score(put(board, cell, turn), me, other(turn), depth + 1));
  return turn === me ? Math.max(...values) : Math.min(...values);
}

/**
 * Las jugadas ordenadas de mejor a peor para `me`, con su valor.
 *
 * Exportada porque es el patrón de juego perfecto, y los tests la necesitan
 * para medir si un nivel se puede ganar: contra una máquina fuerte solo un
 * jugador impecable dice algo, y un jugador impecable ES esto.
 */
const memo = new Map<string, { cell: number; value: number }[]>();

export function ranked(board: Board, me: Mark): { cell: number; value: number }[] {
  /*
   * El resultado depende solo de (tablero, quién juega), así que se guarda.
   *
   * El techo es 3^9 posiciones por marca —unas 40 000 entradas— así que no
   * crece sin control, y las posiciones se repiten muchísimo: las primeras
   * jugadas son casi siempre las mismas. Sin esto, la primera respuesta de la
   * máquina recorre el árbol entero en el hilo principal, que en un teléfono
   * viejo es justo donde no conviene gastar.
   */
  const key = `${board.map((one) => one ?? '.').join('')}${me}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;

  const value = freeCells(board)
    .map((cell) => ({ cell, value: score(put(board, cell, me), me, other(me), 1) }))
    .sort((a, b) => b.value - a.value);

  memo.set(key, value);
  return value;
}

/**
 * Qué juega la máquina.
 *
 * Los cinco niveles no son cinco algoritmos: son UN algoritmo y una moneda. La
 * máquina siempre calcula la mejor jugada; lo único que cambia entre niveles es
 * con qué frecuencia se permite no hacerla, y cuando no la hace juega la
 * segunda mejor — nunca una casilla al azar.
 *
 * Que sea una sola perilla no es elegancia, es lo que hace que la escala no se
 * pueda invertir: más `sharpness` es jugar mejor, por definición. Las versiones
 * con dos mecanismos —uno que solo miraba la jugada inmediata y otro que
 * planificaba— se cruzaban de formas que había que descubrir midiendo. Una
 * llegó a dejar el nivel 2 más difícil que el 5, porque "tapar siempre y tomar
 * el centro" resulta ser casi la estrategia perfecta de este juego.
 *
 * Y en el nivel más alto la moneda nunca sale siempre a favor: el tres en línea
 * está resuelto, así que una máquina impecable sería imposible de ganar y ese
 * nivel jamás daría un trofeo ni alimentaría una racha.
 */
export function machineMove(
  board: Board,
  me: Mark,
  config: TicTacToeConfig,
  seed: string,
  ply: number
): number {
  const free = freeCells(board);
  const fallback = free[0] ?? -1;
  if (free.length === 0) return -1;

  const roll = randomAt(seed, ply);
  const options = ranked(board, me);
  const best = options[0];
  if (best === undefined) return fallback;

  /*
   * El titubeo: en vez de la mejor, la segunda.
   *
   * La segunda y no una al azar, y la diferencia importa en las dos puntas. En
   * la de arriba, porque un error creíble es elegir la opción de al lado —una
   * ficha tirada en un lado inútil teniendo el centro libre no se lee como un
   * rival flojo, se lee como un rival que no está—. En la de abajo, porque hace
   * que el nivel más fácil siga siendo un rival: calcula igual que el más
   * difícil, solo que se deja llevar casi la mitad de las veces.
   */
  if (roll > config.sharpness && options.length > 1) {
    return options[1]?.cell ?? best.cell;
  }

  /*
   * Entre jugadas que valen lo mismo elige con la semilla y no la primera.
   *
   * Sin esto la máquina abre SIEMPRE en la misma esquina y responde siempre
   * igual, y a la tercera partida el jugador no está jugando al tres en línea
   * sino repitiendo una secuencia que ya memorizó.
   */
  const tied = options.filter((one) => one.value === best.value);
  return tied[Math.floor(randomAt(seed, ply + 2000) * tied.length)]?.cell ?? best.cell;
}
