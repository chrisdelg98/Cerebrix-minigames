/**
 * Vecinos ortogonales de cada casilla, precalculados por tamaño.
 *
 * El buscador los pide millones de veces y siempre los mismos: calcularlos al
 * vuelo era la mitad del tiempo de generación.
 */
const CACHE = new Map<number, number[][]>();

export function neighbours(size: number): number[][] {
  const hit = CACHE.get(size);
  if (hit !== undefined) return hit;

  const out: number[][] = [];
  for (let i = 0; i < size * size; i += 1) {
    const row = Math.floor(i / size);
    const col = i % size;
    const list: number[] = [];
    if (row > 0) list.push(i - size);
    if (row + 1 < size) list.push(i + size);
    if (col > 0) list.push(i - 1);
    if (col + 1 < size) list.push(i + 1);
    out.push(list);
  }

  CACHE.set(size, out);
  return out;
}

/** ¿Desde `from` se llega a todas las casillas sin visitar? */
export function reaches(size: number, visited: readonly boolean[], from: number): boolean {
  const near = neighbours(size);
  const seen = new Set<number>();
  const queue = [from];
  seen.add(from);

  while (queue.length > 0) {
    const at = queue.pop() as number;
    for (const next of near[at] as number[]) {
      if (visited[next] === true || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }

  let pending = 0;
  for (let i = 0; i < visited.length; i += 1) if (visited[i] !== true) pending += 1;
  // `from` ya está visitada y entró en el recorrido, así que sobra una.
  return seen.size - 1 === pending;
}

/**
 * Techo de trabajo del buscador.
 *
 * El costo promedio de un tablero es de decenas de milisegundos, pero la cola
 * es larga: alguna disposición se dispara y no termina nunca. Antes que hacer
 * esperar a alguien, el buscador se rinde y avisa — quien lo llamó trata ese
 * "no sé" como un "no puedo demostrar que sea único" y prueba otro tablero, que
 * es la respuesta segura.
 */
const BUDGET = 400_000;

/**
 * La cuenta de colores del tablero de ajedrez.
 *
 * Cada paso cambia de color, así que lo que queda por recorrer tiene que
 * alternar a partir del color contrario al de la cabeza. Eso obliga a que las
 * dos mitades queden empatadas, o que sobre exactamente una del color que toca
 * primero. Es una comprobación de dos restas y descarta ramas enteras que la
 * conectividad todavía ve como sanas — es lo que hace viable un 7×7.
 */
function parityOk(size: number, visited: readonly boolean[], head: number): boolean {
  let next = 0;
  let later = 0;
  const headColor = (Math.floor(head / size) + (head % size)) % 2;

  for (let i = 0; i < visited.length; i += 1) {
    if (visited[i] === true) continue;
    if ((Math.floor(i / size) + (i % size)) % 2 === headColor) later += 1;
    else next += 1;
  }

  return next === later || next === later + 1;
}

/**
 * ¿Quedó más de un callejón sin salida?
 *
 * Una casilla sin visitar con una sola salida solo puede ser el final del
 * recorrido, y final hay uno. En cuanto aparecen dos, la rama está muerta —
 * aunque todo siga comunicado, que es lo que `reaches` no ve. Es la poda que
 * vuelve viable demostrar que NO hay un segundo recorrido, que es la pregunta
 * cara: encontrar el primero siempre fue barato.
 */
function deadEnd(size: number, visited: readonly boolean[], head: number): boolean {
  const near = neighbours(size);
  let corners = 0;

  for (let i = 0; i < visited.length; i += 1) {
    if (visited[i] === true) continue;

    let ways = 0;
    for (const n of near[i] as number[]) {
      if (visited[n] !== true || n === head) ways += 1;
    }
    if (ways <= 1 && ++corners > 1) return true;
  }

  return false;
}

/**
 * Cuenta recorridos que pasan por todas las casillas y por los números en
 * orden, cortando en `limit`.
 *
 * La poda que lo hace viable no es la de los números sino la de alcance: en
 * cuanto un paso deja una casilla incomunicada, esa rama ya no puede completar
 * el recorrido, y eso descarta la enorme mayoría de las ramas en el primer par
 * de movimientos.
 */
export function countPaths(
  size: number,
  numbers: readonly number[],
  limit = 2
): { found: number; samples: number[][]; exhausted: boolean } {
  const total = size * size;
  const near = neighbours(size);
  const last = Math.max(...numbers);

  const start = numbers.indexOf(1);
  if (start < 0) return { found: 0, samples: [], exhausted: false };

  const visited = new Array<boolean>(total).fill(false);
  const path: number[] = [];
  let found = 0;
  const samples: number[][] = [];
  let budget = BUDGET;

  const walk = (at: number, expecting: number): void => {
    if (found >= limit || budget <= 0) return;
    budget -= 1;

    const here = numbers[at] as number;
    if (here !== 0 && here !== expecting) return;
    const next = here === 0 ? expecting : expecting + 1;

    visited[at] = true;
    path.push(at);

    if (path.length === total) {
      if (next > last) {
        found += 1;
        samples.push([...path]);
      }
    } else if (
      parityOk(size, visited, at) &&
      reaches(size, visited, at) &&
      !deadEnd(size, visited, at)
    ) {
      for (const step of near[at] as number[]) {
        if (visited[step] !== true) walk(step, next);
        if (found >= limit) break;
      }
    }

    path.pop();
    visited[at] = false;
  };

  walk(start, 1);
  return { found, samples, exhausted: budget <= 0 };
}
