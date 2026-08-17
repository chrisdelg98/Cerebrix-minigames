import { type GameViewProps } from '@core/contract';
import { Cell, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';

import { violations } from '../engine/solve';
import {
  EMPTY,
  MOON,
  SIZE,
  SUN,
  type TangoMove,
  type TangoState,
  type Value,
} from '../engine/types';
import { MoonGlyph, SunGlyph } from '../sprites/TangoIcons';

import s from './TangoView.module.css';

/** Empty → sun → moon → empty. One gesture reaches every state. */
const NEXT: Record<Value, Value> = { [EMPTY]: SUN, [SUN]: MOON, [MOON]: EMPTY };

export function TangoView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<TangoState, TangoMove>) {
  const wrong = new Set(violations(state.values, state.constraints));
  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * SIZE + (hint.cells[0]?.col ?? 0);

  /*
   * Signs live on the cell to their left or above, hung over its edge.
   *
   * They belong in the gutter between two cells, and <Grid> only lays out
   * cells — but <Cell> is already `position: relative`, so a badge parked on
   * its border lands exactly on the seam without a second layer to keep in
   * sync with the board's size.
   */
  const rightSign = new Map<number, boolean>();
  const belowSign = new Map<number, boolean>();
  for (const constraint of state.constraints) {
    if (constraint.j === constraint.i + 1) rightSign.set(constraint.i, constraint.same);
    else belowSign.set(constraint.i, constraint.same);
  }

  return (
    <div className={s.tango}>
      <Grid cols={SIZE} label="Tablero de Tango" gap="var(--sp-1)" framed>
        {state.values.map((value, index) => {
          const isGiven = state.given[index] === true;
          const right = rightSign.get(index);
          const below = belowSign.get(index);

          return (
            <Cell
              key={index}
              state={cellState(value, isGiven, wrong.has(index), index === hinted)}
              authored={value === EMPTY ? undefined : isGiven ? 'clue' : 'player'}
              disabled={!interactive || isGiven}
              label={describe(index, value, isGiven)}
              value={
                <>
                  <Symbol value={value} />
                  {right !== undefined && <Sign kind={right} where="right" />}
                  {below !== undefined && <Sign kind={below} where="below" />}
                </>
              }
              onActivate={() => {
                dispatch({ index, value: NEXT[value] });
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                // Backwards, so a slip costs one tap instead of two.
                dispatch({ index, value: value === EMPTY ? MOON : value === MOON ? SUN : EMPTY });
              }}
            />
          );
        })}
      </Grid>
    </div>
  );
}

function Symbol({ value }: { value: Value }) {
  if (value === EMPTY) return null;
  return (
    <span className={s.symbol} data-value={value}>
      {value === SUN ? <SunGlyph size={22} /> : <MoonGlyph size={22} />}
    </span>
  );
}

function Sign({ kind, where }: { kind: boolean; where: 'right' | 'below' }) {
  return (
    <span className={s.sign} data-where={where} aria-hidden="true">
      {kind ? '=' : '×'}
    </span>
  );
}

function cellState(value: Value, given: boolean, bad: boolean, hinted: boolean): CellState {
  if (hinted) return 'hint';
  if (bad) return 'error';
  if (given) return 'fixed';
  return value === EMPTY ? 'empty' : 'filled';
}

function describe(index: number, value: Value, given: boolean): string {
  const row = Math.floor(index / SIZE) + 1;
  const col = (index % SIZE) + 1;
  const what = value === SUN ? 'sol' : value === MOON ? 'luna' : 'vacía';
  return `Fila ${String(row)}, columna ${String(col)}, ${what}${given ? ', fija' : ''}`;
}
