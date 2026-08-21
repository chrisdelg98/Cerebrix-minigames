import s from './Examples.module.css';

type Slot = 'r' | 'y' | '';

/** Un tablerito de 5×4, suficiente para mostrar una línea de cuatro. */
function Mini({ cells, win, caption }: { cells: Slot[]; win?: number[]; caption: string }) {
  return (
    <div className={s.strip}>
      <div className={s.mini}>
        {cells.map((slot, i) => (
          <span
            key={i}
            className={s.cell}
            data-disc={slot === 'r' ? 'red' : slot === 'y' ? 'yellow' : undefined}
            data-dim={win !== undefined && slot !== '' && !win.includes(i)}
          />
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

const _ = '' as Slot;

/** Las tres direcciones que valen. La diagonal es la que a todos se les escapa. */
export function LineExample() {
  return (
    <div className={s.figure}>
      <Mini
        cells={[_, _, _, _, _, _, _, _, _, _, _, 'y', 'y', _, _, 'r', 'r', 'r', 'r', _]}
        win={[15, 16, 17, 18]}
        caption="en fila"
      />
      <Mini
        cells={[_, _, 'r', _, _, _, 'y', 'r', _, _, _, 'y', 'r', _, _, 'y', 'y', 'r', _, _]}
        win={[2, 7, 12, 17]}
        caption="en columna"
      />
      <Mini
        cells={[_, _, _, 'r', _, _, _, 'r', 'y', _, _, 'r', 'y', 'y', _, 'r', 'y', 'y', 'y', _]}
        win={[3, 7, 11, 15]}
        caption="en diagonal"
      />
    </div>
  );
}

/** La ficha cae: elegís la columna, no la casilla. */
export function GravityExample() {
  return (
    <div className={s.figure}>
      <Mini
        cells={[_, _, 'r', _, _, _, _, _, _, _, _, _, 'y', _, _, 'y', 'r', 'r', _, _]}
        caption="soltás en esa columna…"
      />
      <Mini
        cells={[
          _,
          _,
          _,
          _,
          _,
          _,
          _,
          _,
          _,
          _,
          _,
          _,
          'y',
          _,
          _,
          'y',
          'r',
          'r',
          _,
          _,
          _,
          _,
          'r',
          _,
          _,
        ]}
        caption="…y cae hasta el fondo"
      />
    </div>
  );
}
