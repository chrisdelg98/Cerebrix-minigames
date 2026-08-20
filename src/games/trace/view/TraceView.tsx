import { useCallback, useRef, useState } from 'react';

import { type GameViewProps } from '@core/contract';
import { Cell, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';
import { type CSSVars } from '@design/types';

import { neighbours } from '../engine/solve';
import { type TraceMove, type TraceState } from '../engine/types';

import s from './TraceView.module.css';

export function TraceView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<TraceState, TraceMove>) {
  const { size, numbers } = state;
  const [draft, setDraft] = useState<number[] | null>(null);
  const draftRef = useRef<number[] | null>(null);
  const drawing = useRef(false);

  const path = draft ?? state.path;
  const near = neighbours(size);
  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * size + (hint.cells[0]?.col ?? 0);

  const set = useCallback((next: number[] | null) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const begin = useCallback(
    (index: number) => {
      if (!interactive) return;

      const at = state.path.indexOf(index);
      // Empezar sobre el trazo lo recorta hasta ahí: es la forma natural de
      // corregir sin borrar todo y volver a empezar.
      if (at >= 0) {
        drawing.current = true;
        set(state.path.slice(0, at + 1));
        return;
      }

      if (numbers[index] !== 1 || state.path.length > 0) return;
      drawing.current = true;
      set([index]);
    },
    [interactive, numbers, set, state.path]
  );

  const extend = useCallback(
    (index: number) => {
      const current = draftRef.current;
      if (!drawing.current || current === null) return;

      // Volver sobre el paso anterior deshace: el dedo retrocede y el trazo con él.
      if (current.length > 1 && current[current.length - 2] === index) {
        set(current.slice(0, -1));
        return;
      }

      const head = current[current.length - 1] as number;
      if (current.includes(index) || !(near[head] as number[]).includes(index)) return;

      const number = numbers[index] ?? 0;
      const next = current.reduce((count, cell) => count + ((numbers[cell] ?? 0) > 0 ? 1 : 0), 1);
      if (number !== 0 && number !== next) return;

      set([...current, index]);
    },
    [near, numbers, set]
  );

  const finish = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;

    const stroke = draftRef.current;
    set(null);
    if (stroke !== null) dispatch({ path: stroke });
  }, [dispatch, set]);

  return (
    <div
      className={s.trazo}
      /* Un tono por tablero, sacado de la propia solución: cambia con cada
         partida y no con cada repintado, que es lo que haría un azar de verdad. */
      style={
        { '--trace': `var(--c-trace-${String(((state.solution[0] ?? 0) % 6) + 1)})` } as CSSVars
      }
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={finish}
    >
      <Grid cols={size} label="Tablero de Trazo" gap="0px" framed>
        {numbers.map((number, index) => {
          const at = path.indexOf(index);
          const arms = at < 0 ? [] : directions(path, at, size);

          return (
            <Cell
              key={index}
              state={cellState(index === hinted)}
              disabled={!interactive}
              label={describe(index, size, number, at)}
              value={
                <>
                  {arms.length > 0 && (
                    <span className={s.pipe} aria-hidden="true">
                      {arms.map((arm) => (
                        <span key={arm} className={s.arm} data-dir={arm} />
                      ))}
                      <span className={s.hub} />
                    </span>
                  )}
                  {number > 0 && <span className={s.number}>{number}</span>}
                </>
              }
              onPointerDown={() => {
                begin(index);
              }}
              onPointerEnter={() => {
                extend(index);
              }}
            />
          );
        })}
      </Grid>
    </div>
  );
}

/** Hacia dónde sale el trazo de esta casilla: al paso anterior y al siguiente. */
function directions(path: readonly number[], at: number, size: number): string[] {
  const cell = path[at] as number;
  const out: string[] = [];

  for (const other of [path[at - 1], path[at + 1]]) {
    if (other === undefined) continue;
    if (other === cell - size) out.push('up');
    else if (other === cell + size) out.push('down');
    else if (other === cell - 1) out.push('left');
    else out.push('right');
  }

  return out;
}

function cellState(hinted: boolean): CellState {
  return hinted ? 'hint' : 'empty';
}

function describe(index: number, size: number, number: number, at: number): string {
  const where = `Fila ${String(Math.floor(index / size) + 1)}, columna ${String((index % size) + 1)}`;
  const numbered = number > 0 ? `, número ${String(number)}` : '';
  return at < 0 ? `${where}${numbered}` : `${where}${numbered}, paso ${String(at + 1)} del trazo`;
}
