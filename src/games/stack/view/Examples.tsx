import { type CSSVars } from '@design/types';

import s from './Examples.module.css';

/** Una torrecita: cada fila es `[inicio, ancho]` sobre doce ranuras. */
function Mini({
  floors,
  moving,
  caption,
}: {
  floors: [number, number][];
  moving?: [number, number];
  caption: string;
}) {
  return (
    <div className={s.strip}>
      <div className={s.mini}>
        {moving && (
          <span className={s.moving} style={{ '--x': moving[0], '--w': moving[1] } as CSSVars} />
        )}
        {floors.map(([start, width], i) => (
          <span key={i} className={s.floor} style={{ '--x': start, '--w': width } as CSSVars} />
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

/** Lo que hay que entender primero: lo que sobresale se cae. */
export function TrimExample() {
  return (
    <div className={s.figure}>
      <Mini floors={[[3, 6]]} moving={[6, 6]} caption="soltás corrido…" />
      <Mini
        floors={[
          [6, 3],
          [3, 6],
        ]}
        caption="…y perdés lo que sobra"
      />
    </div>
  );
}

/** El premio de apuntar: clavarlo devuelve terreno. */
export function PerfectExample() {
  return (
    <div className={s.figure}>
      <Mini floors={[[4, 4]]} moving={[4, 4]} caption="justo encima…" />
      <Mini
        floors={[
          [4, 5],
          [4, 4],
        ]}
        caption="…y recuperás una ranura"
      />
    </div>
  );
}
