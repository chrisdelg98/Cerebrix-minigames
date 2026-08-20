import { type CSSVars } from '@design/types';

import s from './Examples.module.css';

/** Un tablero de 4×4 con la víbora, la fruta y hacia dónde va. */
function Mini({ body, food, caption }: { body: number[]; food?: number; caption: string }) {
  return (
    <div className={s.strip}>
      <div className={s.mini}>
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className={s.cell}
            data-body={body.includes(i)}
            data-head={body[0] === i}
            data-food={food === i}
            style={{ '--i': i } as CSSVars}
          />
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

export function GrowExample() {
  return (
    <div className={s.figure}>
      <Mini body={[6, 5, 4]} food={7} caption="la fruta está adelante" />
      <Mini body={[7, 6, 5, 4]} caption="la comés y crecés uno" />
    </div>
  );
}

/** Lo que mata: la pared y vos mismo. */
export function CrashExample() {
  return (
    <div className={s.figure}>
      <Mini body={[3, 2, 1]} caption="la pared está pegada" />
      <Mini body={[6, 5, 9, 10]} caption="y tu propio cuerpo también cuenta" />
    </div>
  );
}
