import { useEffect, useRef } from 'react';

import { type GameViewProps } from '@core/contract';
import { Cell, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';
import { type CSSVars } from '@design/types';

import { type MemoryMove, type MemoryState } from '../engine/types';
import { Shape } from '../sprites/MemoryIcons';

import s from './MemoryView.module.css';

/** Lo que tarda un par que no coincide en volverse a tapar. */
const PEEK_MS = 950;

export function MemoryView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<MemoryState, MemoryMove>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pair = state.up.length === 2;

  /*
   * El único lugar del juego donde el tiempo hace algo por su cuenta.
   *
   * El motor no tiene reloj y no debería tenerlo: es lógica pura, corre en un
   * worker y en un test sin DOM. Así que el temporizador vive acá y lo que
   * manda es un movimiento como cualquier otro — el motor sigue sin saber que
   * existe el tiempo.
   */
  useEffect(() => {
    if (!pair) return;
    timer.current = setTimeout(() => {
      dispatch({ kind: 'hide' });
    }, PEEK_MS);

    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [pair, dispatch, state.up]);

  const hinted = new Set(hint?.cells.map(({ row, col }) => row * state.cols + col) ?? []);

  return (
    <Grid cols={state.cols} rows={state.rows} label="Tablero de Memoria" gap="var(--sp-1)" framed>
      {state.symbols.map((symbol, index) => {
        const isMatched = state.matched[index] === true;
        const isUp = isMatched || state.up.includes(index);

        return (
          /* Envoltorio transparente: <Cell> no acepta `style`, y el tinte de la
             figura tiene que llegarle heredado. Mismo truco que en Queens. */
          <span
            key={index}
            className={s.card}
            style={{ '--shape': `var(--c-region-${String((symbol % 9) + 1)})` } as CSSVars}
          >
            <Cell
              state={cellState(isUp, isMatched, hinted.has(index))}
              disabled={!interactive || isUp}
              label={describe(index, state.cols, isUp, isMatched, symbol)}
              value={isUp ? <Shape id={symbol} /> : undefined}
              animate={isUp ? 'pop-in' : 'none'}
              onActivate={() => {
                dispatch({ kind: 'flip', index });
              }}
            />
          </span>
        );
      })}
    </Grid>
  );
}

function cellState(isUp: boolean, isMatched: boolean, hinted: boolean): CellState {
  if (hinted) return 'hint';
  if (isMatched) return 'fixed';
  return isUp ? 'filled' : 'covered';
}

function describe(
  index: number,
  cols: number,
  isUp: boolean,
  isMatched: boolean,
  symbol: number
): string {
  const where = `Fila ${String(Math.floor(index / cols) + 1)}, columna ${String((index % cols) + 1)}`;
  if (isMatched) return `${where}, par encontrado, figura ${String(symbol + 1)}`;
  return isUp ? `${where}, figura ${String(symbol + 1)}` : `${where}, tapada`;
}
