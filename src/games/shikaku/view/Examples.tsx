import { type CSSVars } from '@design/types';

import s from './Examples.module.css';

interface Piece {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: string;
  bad?: boolean;
}

/** Un tablerito de 4×4 con sus números y las piezas dibujadas encima. */
function Mini({
  numbers,
  pieces,
  caption,
}: {
  numbers: Record<number, number>;
  pieces: Piece[];
  caption: string;
}) {
  return (
    <div className={s.strip}>
      <div className={s.mini}>
        {pieces.map((piece, i) => (
          <span
            key={i}
            className={s.piece}
            data-bad={piece.bad === true}
            style={
              {
                '--x': piece.x,
                '--y': piece.y,
                '--w': piece.w,
                '--h': piece.h,
                '--tone': piece.tone,
              } as CSSVars
            }
          />
        ))}
        {Array.from({ length: 16 }, (_, cell) => (
          <span key={cell} className={s.cell}>
            {numbers[cell] ?? ''}
          </span>
        ))}
      </div>
      <span className={s.note}>{caption}</span>
    </div>
  );
}

/** La regla entera: el número dice el ÁREA, no la forma. */
export function AreaExample() {
  return (
    <div className={s.figure}>
      <Mini
        numbers={{ 1: 4 }}
        pieces={[{ x: 0, y: 0, w: 4, h: 1, tone: 'var(--c-region-2)' }]}
        caption="un 4 puede ser 4×1…"
      />
      <Mini
        numbers={{ 5: 4 }}
        pieces={[{ x: 0, y: 1, w: 2, h: 2, tone: 'var(--c-region-6)' }]}
        caption="…o 2×2"
      />
    </div>
  );
}

/** Lo que nunca vale: dos números en la misma pieza. */
export function OneNumberExample() {
  return (
    <div className={s.figure}>
      <Mini
        numbers={{ 0: 3, 2: 3 }}
        pieces={[{ x: 0, y: 0, w: 3, h: 1, tone: 'var(--c-region-1)', bad: true }]}
        caption="dos números adentro: no vale"
      />
      <Mini
        numbers={{ 0: 3, 4: 3 }}
        pieces={[
          { x: 0, y: 0, w: 3, h: 1, tone: 'var(--c-region-1)' },
          { x: 0, y: 1, w: 3, h: 1, tone: 'var(--c-region-4)' },
        ]}
        caption="cada número, el suyo"
      />
    </div>
  );
}
