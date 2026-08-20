import { type CSSVars } from '@design/types';

import s from './Examples.module.css';

/** Una tira de cinco casillas: la fila que hay que cruzar. */
function Row({
  cars,
  player,
  kind,
  caption,
}: {
  cars: number[];
  player?: number;
  kind: 'road' | 'safe';
  caption: string;
}) {
  return (
    <div className={s.strip}>
      <div className={s.row} data-kind={kind}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={s.cell}
            data-car={cars.includes(i)}
            data-player={player === i}
            style={{ '--i': i } as CSSVars}
          />
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

/** Lo que hay que aprender primero: el hueco se mira antes de cruzar. */
export function GapExample() {
  return (
    <div className={s.figure}>
      <Row kind="road" cars={[0, 3]} player={2} caption="mirás el hueco…" />
      <Row kind="safe" cars={[]} player={2} caption="…y cruzás" />
    </div>
  );
}

/** La regla que no es obvia: moverse no adelanta el reloj. */
export function WaitExample() {
  return (
    <div className={s.figure}>
      <Row kind="safe" cars={[]} player={1} caption="podés esperar en la vereda" />
      <Row kind="road" cars={[0, 3]} caption="el tráfico sigue su ritmo" />
    </div>
  );
}
