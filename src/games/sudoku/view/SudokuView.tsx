import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type GameViewProps } from '@core/contract';
import { Cell, type BlockEdge, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';

import { PEERS, SIZE, colOf, conflictsIn, notesOf, rowOf } from '../engine/grid';
import { type SudokuMove, type SudokuState } from '../engine/types';
import { NumberPad } from './NumberPad';
import { Notes } from './Notes';

import s from './SudokuView.module.css';

/**
 * The board. It reads state and calls `dispatch` — it never runs a rule and
 * never decides whether a move was legal.
 *
 * Selection and pencil mode are view-local on purpose: neither is part of the
 * game state, so neither belongs in the undo stack. Undoing should step back
 * through moves, not through where the cursor happened to be.
 */
export function SudokuView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<SudokuState, SudokuMove>) {
  const [selected, setSelected] = useState(0);
  const [pencil, setPencil] = useState(false);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Recomputed only when the digits change, not on every selection move: it is
  // 81 × 20 comparisons and selection changes on every arrow key.
  const conflicts = useMemo(() => conflictsIn(state), [state]);

  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * SIZE + (hint.cells[0]?.col ?? 0);
  const selectedValue = state.values[selected] ?? 0;
  const peersOfSelected = useMemo(() => new Set(PEERS[selected] ?? []), [selected]);

  const play = useCallback(
    (move: SudokuMove) => {
      if (interactive) dispatch(move);
    },
    [dispatch, interactive]
  );

  const enter = useCallback(
    (value: number) => {
      play(
        pencil ? { kind: 'note', index: selected, value } : { kind: 'set', index: selected, value }
      );
    },
    [play, pencil, selected]
  );

  const move = useCallback((from: number, dRow: number, dCol: number) => {
    const row = Math.min(SIZE - 1, Math.max(0, rowOf(from) + dRow));
    const col = Math.min(SIZE - 1, Math.max(0, colOf(from) + dCol));
    return row * SIZE + col;
  }, []);

  // Focus follows selection, so the keyboard and the pointer agree on where
  // the player is. Without it, arrowing away from a clicked cell would leave
  // focus behind and the next Tab would jump somewhere unrelated.
  useEffect(() => {
    cellRefs.current[selected]?.focus({ preventScroll: true });
  }, [selected]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;

    const arrows: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };

    if (key in arrows) {
      const [dRow, dCol] = arrows[key] ?? [0, 0];
      event.preventDefault();
      setSelected((current) => move(current, dRow, dCol));
      return;
    }

    if (key >= '1' && key <= '9') {
      event.preventDefault();
      enter(Number(key));
      return;
    }

    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      event.preventDefault();
      play({ kind: 'erase', index: selected });
      return;
    }

    // Same letter in both languages, and it is where the finger already is.
    if (key === 'n' || key === 'N') {
      event.preventDefault();
      setPencil((on) => !on);
    }
  };

  return (
    <div className={s.sudoku}>
      {/* The wrapper owns keyboard nav for all 81 cells: 81 handlers would be
          81 closures rebuilt on every state change. */}
      <div onKeyDown={onKeyDown} className={s.boardWrap}>
        <Grid cols={SIZE} label="Tablero de Sudoku" gap="var(--bw-hair)">
          {state.values.map((value, index) => (
            <Cell
              key={index}
              ref={(node) => {
                cellRefs.current[index] = node;
              }}
              state={cellState({
                index,
                value,
                selected,
                selectedValue,
                given: state.given[index] === true,
                conflicted: conflicts.has(index),
                hinted: index === hinted,
                isPeer: peersOfSelected.has(index),
              })}
              value={value !== 0 ? value : <Notes values={notesOf(state.notes[index] ?? 0)} />}
              label={describe(index, value, state.given[index] === true)}
              blockEdges={blockEdgesFor(index)}
              disabled={!interactive}
              onActivate={() => {
                setSelected(index);
              }}
            />
          ))}
        </Grid>
      </div>

      <NumberPad
        pencil={pencil}
        disabled={!interactive}
        remaining={remainingPerDigit(state)}
        onDigit={enter}
        onErase={() => {
          play({ kind: 'erase', index: selected });
        }}
        onTogglePencil={() => {
          setPencil((on) => !on);
        }}
      />
    </div>
  );
}

/**
 * One cell, one state. The order IS the priority: an error has to win over the
 * selection ring, or a wrong digit stops looking wrong the moment you click it.
 */
function cellState(cell: {
  index: number;
  value: number;
  selected: number;
  selectedValue: number;
  given: boolean;
  conflicted: boolean;
  hinted: boolean;
  isPeer: boolean;
}): CellState {
  if (cell.conflicted) return 'error';
  if (cell.hinted) return 'hint';
  if (cell.index === cell.selected) return 'selected';
  if (cell.value !== 0 && cell.value === cell.selectedValue) return 'same';
  if (cell.isPeer) return 'peer';
  if (cell.given) return 'fixed';
  return cell.value === 0 ? 'empty' : 'filled';
}

/** Thick dividers on the inner edges of the 3×3 boxes. */
function blockEdgesFor(index: number): BlockEdge[] {
  const edges: BlockEdge[] = [];
  const row = rowOf(index);
  const col = colOf(index);
  if (col % 3 === 2 && col !== SIZE - 1) edges.push('right');
  if (row % 3 === 2 && row !== SIZE - 1) edges.push('bottom');
  return edges;
}

function describe(index: number, value: number, given: boolean): string {
  const where = `fila ${String(rowOf(index) + 1)}, columna ${String(colOf(index) + 1)}`;
  if (value === 0) return `${where}, vacía`;
  return `${where}, ${String(value)}${given ? ', pista' : ''}`;
}

/** How many of each digit are still missing, so the pad can retire the ones that are done. */
function remainingPerDigit(state: SudokuState): number[] {
  const remaining = new Array<number>(SIZE + 1).fill(SIZE);
  remaining[0] = 0;
  for (const value of state.values) {
    if (value !== 0) remaining[value] = (remaining[value] ?? 0) - 1;
  }
  return remaining;
}
