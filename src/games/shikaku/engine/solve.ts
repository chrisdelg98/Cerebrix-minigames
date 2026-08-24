import { type Rect } from './types';

export const area = (rect: Rect): number => rect.w * rect.h;

export function covers(rect: Rect, cell: number, size: number): boolean {
  const x = cell % size;
  const y = Math.floor(cell / size);
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function cellsOf(rect: Rect, size: number): number[] {
  const out: number[] = [];
  for (let dy = 0; dy < rect.h; dy += 1) {
    for (let dx = 0; dx < rect.w; dx += 1) out.push((rect.y + dy) * size + rect.x + dx);
  }
  return out;
}

/** Los números que caen dentro del rectángulo. */
export function numbersIn(rect: Rect, size: number, numbers: readonly number[]): number[] {
  return cellsOf(rect, size)
    .map((cell) => numbers[cell] ?? 0)
    .filter((value) => value > 0);
}

/**
 * Cuenta soluciones, cortando en `limit`.
 *
 * Cubierta exacta por rectángulos: se toma la PRIMERA casilla sin cubrir y se
 * prueban todos los rectángulos que la incluyen, contienen exactamente un
 * número y miden lo que ese número dice. Empezar siempre por la primera libre
 * es lo que hace que esto sea rápido — cada casilla se resuelve una sola vez y
 * no se exploran permutaciones del mismo reparto.
 *
 * `budget` existe por la misma razón que en Trazo: esto puede correr en el hilo
 * principal y una posición rara no puede colgar la pestaña. Al agotarse avisa, y
 * quien llama trata ese "no sé" como "no puedo demostrar que sea único".
 */
export function countSolutions(
  size: number,
  numbers: readonly number[],
  maxArea: number,
  limit = 2,
  budget = 400_000
): { found: number; exhausted: boolean } {
  const total = size * size;
  const cover = new Int8Array(total);
  let found = 0;
  let left = budget;

  const walk = (): boolean => {
    if (left-- <= 0) return true;

    let first = -1;
    for (let i = 0; i < total; i += 1) {
      if (cover[i] === 0) {
        first = i;
        break;
      }
    }
    if (first < 0) {
      found += 1;
      return found >= limit;
    }

    const fx = first % size;
    const fy = Math.floor(first / size);

    for (let w = 1; w <= maxArea && w <= size; w += 1) {
      for (let h = 1; w * h <= maxArea && h <= size; h += 1) {
        for (let x = Math.max(0, fx - w + 1); x <= fx && x + w <= size; x += 1) {
          for (let y = Math.max(0, fy - h + 1); y <= fy && y + h <= size; y += 1) {
            let free = true;
            let seen = 0;
            let value = 0;

            for (let dy = 0; dy < h && free; dy += 1) {
              for (let dx = 0; dx < w; dx += 1) {
                const cell = (y + dy) * size + x + dx;
                if (cover[cell] !== 0) {
                  free = false;
                  break;
                }
                const number = numbers[cell] ?? 0;
                if (number > 0) {
                  seen += 1;
                  value = number;
                }
              }
            }
            if (!free || seen !== 1 || value !== w * h) continue;

            for (let dy = 0; dy < h; dy += 1) {
              for (let dx = 0; dx < w; dx += 1) cover[(y + dy) * size + x + dx] = 1;
            }
            const stop = walk();
            for (let dy = 0; dy < h; dy += 1) {
              for (let dx = 0; dx < w; dx += 1) cover[(y + dy) * size + x + dx] = 0;
            }
            if (stop) return true;
          }
        }
      }
    }
    return false;
  };

  walk();
  return { found, exhausted: left <= 0 };
}
