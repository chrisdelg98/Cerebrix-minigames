import { type GameViewProps } from '@core/contract';
import { type CSSVars } from '@design/types';

import { type DummyMove, type DummyState } from '../engine/types';

import s from './DummyView.module.css';

/**
 * The board. It reads state and calls `dispatch` — it never mutates anything,
 * never runs a rule, and never knows whether the move it sent was accepted.
 *
 * The tile grid is written here only because <Cell> and <Grid> land in Phase 2;
 * once they exist this view drops to a handful of lines (docs/STYLING.md §2).
 */
export function DummyView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<DummyState, DummyMove>) {
  const hinted = hint?.cells[0]?.col;

  return (
    <div
      className={`${s.board} no-select`}
      style={{ '--cols': Math.min(3, state.tiles.length) } as CSSVars}
      role="group"
      aria-label="Casillas"
    >
      {state.tiles.map((marked, index) => (
        <button
          // The tiles are a fixed-length positional grid: the index IS the identity.
          key={index}
          type="button"
          className={s.tile}
          data-marked={marked}
          data-hinted={index === hinted}
          disabled={!interactive}
          aria-pressed={marked}
          aria-label={`Casilla ${index + 1}${marked ? ', marcada' : ''}`}
          onClick={() => {
            dispatch({ kind: 'mark', index });
          }}
        />
      ))}
    </div>
  );
}
