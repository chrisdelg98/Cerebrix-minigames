import { useCallback, useRef, useState } from 'react';

import { type GameViewProps } from '@core/contract';
import { Cell, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';
import { type CSSVars } from '@design/types';

import { MINE, distance, flagCount } from '../engine/board';
import { type MinesweeperMove, type MinesweeperState } from '../engine/types';
import { Flag, Mine } from '../sprites/MinesweeperIcons';

import s from './MinesweeperView.module.css';

/** docs/DESIGN_SYSTEM.md §7.3 — long press is 400ms. */
const LONG_PRESS_MS = 400;

export function MinesweeperView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<MinesweeperState, MinesweeperMove>) {
  const [origin, setOrigin] = useState(-1);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flagged = useRef(false);

  const remaining = state.mines - flagCount(state);
  const hinted =
    hint === null ? -1 : (hint.cells[0]?.row ?? 0) * state.cols + (hint.cells[0]?.col ?? 0);

  const cancelPress = useCallback(() => {
    if (longPress.current !== null) clearTimeout(longPress.current);
    longPress.current = null;
  }, []);

  const play = useCallback(
    (move: MinesweeperMove) => {
      if (interactive) dispatch(move);
    },
    [dispatch, interactive]
  );

  const open = useCallback(
    (index: number) => {
      // The origin of the cascade, so the wave can spread from where it started.
      setOrigin(index);
      // Tapping a satisfied number clears around it; that is chording, and on a
      // phone it is the difference between one tap and eight.
      play(state.revealed[index] === true ? { kind: 'chord', index } : { kind: 'reveal', index });
    },
    [play, state.revealed]
  );

  return (
    <div className={s.minesweeper}>
      <div className={s.status}>
        <span className={s.counter}>
          <Flag size={18} />
          <span className="tabular">{remaining}</span>
        </span>
        <span className={s.hintText}>Mantené apretado para poner una bandera</span>
      </div>

      <Grid cols={state.cols} rows={state.rows} label="Campo minado" gap="var(--sp-1)" framed>
        {state.values.map((value, index) => {
          const isRevealed = state.revealed[index] === true;
          const isFlagged = state.flagged[index] === true;

          return (
            <Cell
              key={index}
              state={cellState(state, index, hinted)}
              value={content(state, index, isRevealed, isFlagged)}
              label={describe(state, index, isRevealed, isFlagged)}
              distance={origin < 0 ? undefined : distance(index, origin, state.cols)}
              animate={isRevealed && value !== MINE ? 'reveal-wave' : 'none'}
              disabled={!interactive}
              onActivate={() => {
                // A long press already fired: swallow the click it turns into.
                if (flagged.current) {
                  flagged.current = false;
                  return;
                }
                open(index);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                play({ kind: 'flag', index });
              }}
              onPointerDown={() => {
                flagged.current = false;
                longPress.current = setTimeout(() => {
                  flagged.current = true;
                  play({ kind: 'flag', index });
                  navigator.vibrate?.(12);
                }, LONG_PRESS_MS);
              }}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
            />
          );
        })}
      </Grid>
    </div>
  );
}

function cellState(state: MinesweeperState, index: number, hinted: number): CellState {
  if (state.revealed[index] !== true) {
    return index === hinted ? 'hint' : 'covered';
  }
  if (state.values[index] === MINE) return 'error';
  return state.values[index] === 0 ? 'empty' : 'filled';
}

function content(
  state: MinesweeperState,
  index: number,
  isRevealed: boolean,
  isFlagged: boolean
): React.ReactNode {
  if (!isRevealed) return isFlagged ? <Flag size={18} /> : null;

  const value = state.values[index] ?? 0;
  if (value === MINE) {
    return <Mine size={18} state={index === state.detonated ? 'exploded' : 'revealed'} />;
  }
  if (value === 0) return null;

  // The classic colour per count, as a knob the stylesheet reads.
  return (
    <span className={s.count} style={{ '--count': value } as CSSVars}>
      {value}
    </span>
  );
}

function describe(
  state: MinesweeperState,
  index: number,
  isRevealed: boolean,
  isFlagged: boolean
): string {
  const where = `fila ${String(Math.floor(index / state.cols) + 1)}, columna ${String((index % state.cols) + 1)}`;
  if (isFlagged) return `${where}, con bandera`;
  if (!isRevealed) return `${where}, sin descubrir`;

  const value = state.values[index] ?? 0;
  if (value === MINE) return `${where}, mina`;
  return value === 0 ? `${where}, vacía` : `${where}, ${String(value)} minas alrededor`;
}
