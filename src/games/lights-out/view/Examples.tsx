import s from './Examples.module.css';

/** Un 3×3 chiquito. `touch` marca la casilla que se toca en la figura. */
function Mini({ lights, touch, caption }: { lights: boolean[]; touch?: number; caption: string }) {
  return (
    <div className={s.strip}>
      <div className={s.mini}>
        {lights.map((lit, i) => (
          <span key={i} className={s.cell} data-lit={lit} data-touch={i === touch} />
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

const OFF = Array.from({ length: 9 }, () => false);

/** La regla entera: un toque nunca cambia una sola casilla. */
export function CrossExample() {
  return (
    <div className={s.figure}>
      <Mini lights={OFF} touch={4} caption="tocás el centro" />
      <Mini
        lights={[false, true, false, true, true, true, false, true, false]}
        caption="cambian cinco"
      />
    </div>
  );
}

/** Lo que casi nadie espera: contra el borde, la cruz viene cortada. */
export function EdgeExample() {
  return (
    <div className={s.figure}>
      <Mini lights={OFF} touch={0} caption="tocás una esquina" />
      <Mini
        lights={[true, true, false, true, false, false, false, false, false]}
        caption="cambian tres"
      />
    </div>
  );
}
