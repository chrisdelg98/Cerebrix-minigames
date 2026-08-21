import s from './Examples.module.css';

type Cell = 'x' | 'o' | '';

function Mini({ cells, win, caption }: { cells: Cell[]; win?: number[]; caption: string }) {
  return (
    <div className={s.strip}>
      <div className={s.mini}>
        {cells.map((mark, i) => (
          <span
            key={i}
            className={s.cell}
            data-mark={mark === '' ? undefined : mark}
            data-dim={win !== undefined && mark !== '' && !win.includes(i)}
          >
            {mark === 'x' ? '✕' : mark === 'o' ? '○' : ''}
          </span>
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

/** Qué cuenta como línea: las tres direcciones, en una sola figura. */
export function LineExample() {
  return (
    <div className={s.figure}>
      <Mini cells={['x', 'x', 'x', 'o', 'o', '', '', '', '']} win={[0, 1, 2]} caption="en fila" />
      <Mini
        cells={['o', 'x', '', 'o', 'x', '', '', 'x', 'o']}
        win={[1, 4, 7]}
        caption="en columna"
      />
      <Mini
        cells={['x', 'o', '', 'o', 'x', '', '', 'o', 'x']}
        win={[0, 4, 8]}
        caption="en diagonal"
      />
    </div>
  );
}

/** La jugada que hay que ver: tapar antes de que el otro cierre. */
export function BlockExample() {
  return (
    <div className={s.figure}>
      <Mini cells={['o', 'o', '', 'x', '', '', '', '', 'x']} caption="al otro le falta una" />
      <Mini
        cells={['o', 'o', 'x', 'x', '', '', '', '', 'x']}
        caption="tapás ahí, no en otro lado"
      />
    </div>
  );
}
