import { type CSSVars } from '@design/types';

import { SwipeIcon } from '../sprites/Game2048Icons';

import s from './Examples.module.css';

function Row({ values, caption }: { values: number[]; caption: string }) {
  return (
    <div className={s.strip}>
      {values.map((value, i) => (
        <span
          key={i}
          className={s.tile}
          style={{ '--level': value === 0 ? 0 : Math.log2(value) } as CSSVars}
          data-empty={value === 0}
          data-strong={value >= 64}
        >
          {value === 0 ? '' : value}
        </span>
      ))}
      <span className={s.note}>{caption}</span>
    </div>
  );
}

export function MergeExample() {
  return (
    <div className={s.figure}>
      <Row values={[2, 2, 0, 0]} caption="antes" />
      <div className={s.arrow}>
        <SwipeIcon size={18} />
      </div>
      <Row values={[0, 0, 0, 4]} caption="empujás a la derecha" />
    </div>
  );
}

/**
 * La confusión más común de quien nunca jugó: creer que se juntan por tocarse.
 *
 * Se juntan por ser IGUALES. Dibujar el caso en que no pasa nada enseña la
 * regla mejor que repetir el caso en que sí — la diferencia entre las dos
 * figuras es toda la lección.
 */
export function DifferentExample() {
  return (
    <div className={s.figure}>
      <Row values={[2, 4, 0, 0]} caption="antes" />
      <div className={s.arrow}>
        <SwipeIcon size={18} />
      </div>
      <Row values={[0, 0, 2, 4]} caption="se corren, siguen separadas" />
    </div>
  );
}

/** La regla que todo el mundo se lleva mal: una ficha fusiona UNA vez por jugada. */
export function OnceExample() {
  return (
    <div className={s.figure}>
      <Row values={[2, 2, 2, 2]} caption="antes" />
      <div className={s.arrow}>
        <SwipeIcon size={18} />
      </div>
      <Row values={[0, 0, 4, 4]} caption="dos cuatros, no un ocho" />
    </div>
  );
}
