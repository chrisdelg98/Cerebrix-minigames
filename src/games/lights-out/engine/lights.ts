/**
 * La casilla y sus cuatro vecinas ortogonales: lo que apaga o enciende un toque.
 *
 * Vive aparte del motor porque lo usan las dos mitades del juego — aplicar una
 * jugada y resolver el tablero — y son la MISMA regla. Escrita dos veces, una
 * de las dos se equivoca tarde o temprano.
 */
export function affected(index: number, size: number): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const cells = [index];

  if (row > 0) cells.push(index - size);
  if (row < size - 1) cells.push(index + size);
  if (col > 0) cells.push(index - 1);
  if (col < size - 1) cells.push(index + 1);

  return cells;
}

export function toggle(lights: readonly boolean[], index: number, size: number): boolean[] {
  const next = [...lights];
  for (const cell of affected(index, size)) next[cell] = !next[cell];
  return next;
}

/**
 * Qué casillas hay que tocar para apagar todo.
 *
 * Apagar luces es un sistema de ecuaciones lineales en GF(2) — el cuerpo de dos
 * elementos, donde sumar es XOR. Sale de dos propiedades del juego: tocar dos
 * veces la misma casilla la deja como estaba (por eso cada incógnita es 0 o 1)
 * y el orden de los toques no cambia el resultado (por eso es un sistema y no
 * una búsqueda). Se resuelve con eliminación gaussiana, igual que en la escuela
 * pero con XOR en lugar de restar.
 *
 * Devuelve null si el tablero no tiene solución. No puede pasar con un tablero
 * generado por este motor — se arma aplicando toques sobre uno apagado, así que
 * la solución existe por construcción — pero un estado que vuelve del guardado
 * es un dato de afuera, y afuera puede venir cualquier cosa.
 */
export function solve(lights: readonly boolean[], size: number): number[] | null {
  const n = size * size;

  // Fila i: qué toques afectan a la casilla i, más el estado actual al final.
  const rows: number[][] = Array.from({ length: n }, (_, cell) => {
    const row = Array.from({ length: n + 1 }, () => 0);
    row[n] = lights[cell] === true ? 1 : 0;
    return row;
  });

  for (let click = 0; click < n; click += 1) {
    for (const cell of affected(click, size)) {
      const row = rows[cell];
      if (row) row[click] = 1;
    }
  }

  // Eliminación: se deja cada pivote solo en su columna.
  const pivots: number[] = [];
  let pivotRow = 0;

  for (let col = 0; col < n && pivotRow < n; col += 1) {
    const found = rows.findIndex((row, i) => i >= pivotRow && row[col] === 1);
    if (found === -1) continue;

    [rows[pivotRow], rows[found]] = [rows[found] as number[], rows[pivotRow] as number[]];
    const base = rows[pivotRow] as number[];

    for (let i = 0; i < n; i += 1) {
      if (i === pivotRow) continue;
      const row = rows[i] as number[];
      if (row[col] !== 1) continue;
      for (let j = col; j <= n; j += 1) row[j] = (row[j] ?? 0) ^ (base[j] ?? 0);
    }

    pivots.push(col);
    pivotRow += 1;
  }

  // Una fila que quedó en 0 = 1 dice que el tablero no se puede apagar.
  for (const row of rows) {
    if (row.slice(0, n).every((value) => value === 0) && row[n] === 1) return null;
  }

  /*
   * Las incógnitas libres se dejan en cero.
   *
   * En algunos tamaños el sistema tiene más de una solución — un 5×5 tiene
   * cuatro — y todas apagan el tablero igual. Elegir la de las libres en cero
   * es elegir una cualquiera, que es todo lo que hace falta para una pista.
   */
  const solution: number[] = [];
  pivots.forEach((col, i) => {
    if ((rows[i] as number[])[n] === 1) solution.push(col);
  });

  return solution;
}
