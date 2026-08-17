import { Shape } from '../sprites/MemoryIcons';

import s from './Examples.module.css';

/** `.` tapada · un dígito, la figura que muestra. */
function Row({ cells, caption }: { cells: string; caption?: string }) {
  return (
    <div className={s.strip}>
      {[...cells].map((char, i) => (
        <span key={i} className={s.card} data-face={char === '.' ? 'down' : 'up'}>
          {char !== '.' && <Shape id={Number(char)} />}
        </span>
      ))}
      {caption !== undefined && <span className={s.note}>{caption}</span>}
    </div>
  );
}

export function PairExample() {
  return (
    <div className={s.figure}>
      <Row cells="0.0." caption="iguales" />
      <Row cells="1.2." caption="distintas" />
    </div>
  );
}

export function MemoExample() {
  return (
    <div className={s.figure}>
      <Row cells="3..." caption="la viste acá" />
      <Row cells="...3" caption="y su par acá" />
    </div>
  );
}
