import { useCallback, useRef, useState, type ReactNode } from 'react';

import { type GameViewProps } from '@core/contract';
import { Cell, type BlockEdge, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';
import { type CSSVars } from '@design/types';

import {
  CROSSED,
  FILLED,
  UNKNOWN,
  type Clue,
  type Mark,
  type NonogramMove,
  type NonogramState,
} from '../engine/types';
import { BrushIcon, CrossIcon } from '../sprites/NonogramIcons';

import s from './NonogramView.module.css';

/** The thick rule every five cells. Counting to five is the whole method. */
const BLOCK = 5;

type Mode = typeof FILLED | typeof CROSSED;

/** A stroke in progress: painted on screen, not yet sent to the engine. */
interface Draft {
  mark: Mark;
  indices: Set<number>;
}

export function NonogramView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<NonogramState, NonogramMove>) {
  const [mode, setMode] = useState<Mode>(FILLED);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [focus, setFocus] = useState(-1);

  /*
   * The draft is mirrored into a ref because the handler that commits it runs
   * on pointerup, and reading it out of the closure there would see whatever
   * the value was when that handler was created — one cell, not the stroke.
   */
  const draftRef = useRef<Draft | null>(null);
  const dragging = useRef(false);
  const usedPointer = useRef(false);

  const { size, rowClues, colClues, marks } = state;
  const clueCols = Math.max(...rowClues.map((clue) => Math.max(clue.length, 1)));
  const clueRows = Math.max(...colClues.map((clue) => Math.max(clue.length, 1)));

  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * size + (hint.cells[0]?.col ?? 0);
  const other: Mode = mode === FILLED ? CROSSED : FILLED;

  const setDraftBoth = useCallback((next: Draft | null) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const begin = useCallback(
    (index: number, wanted: Mode) => {
      if (!interactive) return;

      // Pressing on a square that already holds the mark erases instead, and
      // the whole stroke follows that decision — same as every picross.
      const applied: Mark = (marks[index] ?? UNKNOWN) === wanted ? UNKNOWN : wanted;
      dragging.current = true;
      usedPointer.current = true;
      setDraftBoth({ mark: applied, indices: new Set([index]) });
    },
    [interactive, marks, setDraftBoth]
  );

  const extend = useCallback(
    (index: number) => {
      setFocus(index);

      const current = draftRef.current;
      if (!dragging.current || current === null || current.indices.has(index)) return;

      const indices = new Set(current.indices);
      indices.add(index);
      setDraftBoth({ mark: current.mark, indices });
    },
    [setDraftBoth]
  );

  const finish = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const stroke = draftRef.current;
    setDraftBoth(null);
    if (stroke === null) return;

    /*
     * A one-cell stroke is followed by a click on that same cell, and the guard
     * in onActivate is what stops it counting twice. A stroke across several
     * cells has no common target, so the browser fires the click on the grid
     * instead — nothing to swallow, and leaving the guard armed would eat the
     * next keyboard press.
     */
    if (stroke.indices.size > 1) usedPointer.current = false;
    dispatch({ indices: [...stroke.indices], mark: stroke.mark });
  }, [dispatch, setDraftBoth]);

  const knobs = { '--clue-cols': clueCols, '--board-cols': size } as CSSVars;
  const focusRow = focus < 0 ? -1 : Math.floor(focus / size);
  const focusCol = focus < 0 ? -1 : focus % size;

  const cells: ReactNode[] = [];
  for (let r = 0; r < clueRows + size; r += 1) {
    for (let c = 0; c < clueCols + size; c += 1) {
      const boardRow = r - clueRows;
      const boardCol = c - clueCols;

      if (boardRow < 0 && boardCol < 0) {
        // The dead corner where the two gutters meet.
        cells.push(<span key={`x${String(r)}-${String(c)}`} aria-hidden="true" />);
        continue;
      }

      if (boardRow < 0) {
        cells.push(
          <ClueNumber
            key={`c${String(r)}-${String(c)}`}
            clue={colClues[boardCol] ?? []}
            slot={r}
            slots={clueRows}
            band={Math.floor(boardCol / BLOCK) % 2 === 1}
            active={boardCol === focusCol}
            done={lineDone(columnOf(state, boardCol), colClues[boardCol] ?? [])}
          />
        );
        continue;
      }

      if (boardCol < 0) {
        cells.push(
          <ClueNumber
            key={`r${String(r)}-${String(c)}`}
            clue={rowClues[boardRow] ?? []}
            slot={c}
            slots={clueCols}
            band={Math.floor(boardRow / BLOCK) % 2 === 1}
            active={boardRow === focusRow}
            done={lineDone(rowOf(state, boardRow), rowClues[boardRow] ?? [])}
          />
        );
        continue;
      }

      const index = boardRow * size + boardCol;
      const drafted = draft !== null && draft.indices.has(index);
      const mark: Mark = drafted && draft !== null ? draft.mark : (marks[index] ?? UNKNOWN);
      const crosshair = boardRow === focusRow || boardCol === focusCol;

      cells.push(
        <Cell
          key={index}
          state={cellState(mark, index === hinted, crosshair)}
          value={mark === CROSSED ? <span className={s.cross}>✕</span> : undefined}
          label={describe(boardRow, boardCol, mark)}
          blockEdges={edgesFor(boardRow, boardCol, size)}
          disabled={!interactive}
          onActivate={() => {
            // Keyboard only: a pointer already did the work in begin/finish.
            if (usedPointer.current) {
              usedPointer.current = false;
              return;
            }
            if (!interactive) return;
            dispatch({
              indices: [index],
              mark: (marks[index] ?? UNKNOWN) === mode ? UNKNOWN : mode,
            });
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!interactive) return;
            dispatch({
              indices: [index],
              mark: (marks[index] ?? UNKNOWN) === other ? UNKNOWN : other,
            });
          }}
          onPointerDown={() => {
            begin(index, mode);
          }}
          onPointerEnter={() => {
            extend(index);
          }}
        />
      );
    }
  }

  return (
    <div
      className={s.nonogram}
      style={knobs}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={() => {
        finish();
        setFocus(-1);
      }}
    >
      {/*
        A mode switch rather than two gestures, for the same reason Sudoku put
        pencil mode in its number pad: the secondary mark is used constantly
        here, and burying it under a long press makes half the game invisible.
        Right click still reaches the other mark without switching.
      */}
      <div className={s.modes} role="radiogroup" aria-label="Qué hace tocar una casilla">
        <button
          type="button"
          role="radio"
          aria-checked={mode === FILLED}
          className={s.mode}
          data-selected={mode === FILLED}
          onClick={() => {
            setMode(FILLED);
          }}
        >
          <BrushIcon size={16} />
          Pintar
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === CROSSED}
          className={s.mode}
          data-selected={mode === CROSSED}
          onClick={() => {
            setMode(CROSSED);
          }}
        >
          <CrossIcon size={16} />
          Descartar
        </button>

        <span className={s.count}>
          <span className="tabular">{marks.filter((value) => value === FILLED).length}</span>
          <span className={s.countTotal}>
            /{rowClues.reduce((sum, clue) => sum + clue.reduce((a, b) => a + b, 0), 0)}
          </span>
        </span>
      </div>

      <div className={s.boardScroll}>
        <Grid
          cols={clueCols + size}
          rows={clueRows + size}
          label="Tablero de nonograma"
          gap="0px"
          // Un techo por celda además del techo del tablero: sin esto un 3×3
          // se estiraba a tres cuadrados enormes. El límite de viewport ya lo
          // pone <Grid> para todos.
          maxSize="min(560px, calc(var(--cols) * 76px))"
          framed
        >
          {cells}
        </Grid>
      </div>
    </div>
  );
}

interface ClueNumberProps {
  clue: Clue;
  /** Which gutter slot this cell is, counting from the outside in. */
  slot: number;
  slots: number;
  /** Every other group of five, tinted, so a number can be traced to its line. */
  band: boolean;
  active: boolean;
  done: boolean;
}

/**
 * One number of one clue, in its own grid cell.
 *
 * Clues hang towards the board — the last number of a row sits right next to
 * the first square it describes — so the slots are filled from the inside out
 * and the leftovers on the outside stay blank.
 */
function ClueNumber({ clue, slot, slots, band, active, done }: ClueNumberProps) {
  const shown = clue.length === 0 ? [0] : clue;
  const index = slot - (slots - shown.length);
  const value = index < 0 ? null : (shown[index] ?? null);

  return (
    <span
      className={s.clue}
      data-band={band}
      data-active={active}
      data-done={done && value !== null}
      data-wide={value !== null && value > 9}
    >
      {value === null ? '' : value}
    </span>
  );
}

function cellState(mark: Mark, isHinted: boolean, crosshair: boolean): CellState {
  if (isHinted) return 'hint';
  if (mark === FILLED) return 'filled';
  // `peer` exists for exactly this: sharing a line with wherever the eye is.
  return crosshair ? 'peer' : 'empty';
}

function edgesFor(row: number, col: number, size: number): BlockEdge[] {
  const edges: BlockEdge[] = [];
  if (row % BLOCK === 0) edges.push('top');
  if (col % BLOCK === 0) edges.push('left');
  if (row === size - 1) edges.push('bottom');
  if (col === size - 1) edges.push('right');
  return edges;
}

function rowOf(state: NonogramState, row: number): Mark[] {
  const line: Mark[] = [];
  for (let c = 0; c < state.size; c += 1) line.push(state.marks[row * state.size + c] ?? UNKNOWN);
  return line;
}

function columnOf(state: NonogramState, col: number): Mark[] {
  const line: Mark[] = [];
  for (let r = 0; r < state.size; r += 1) line.push(state.marks[r * state.size + col] ?? UNKNOWN);
  return line;
}

/**
 * Whether what the player painted in this line already matches its clue.
 *
 * Read only off the player's own board, never off the solution: it tells them
 * what they have done, not whether it is where it belongs. A line can read as
 * done and still be in the wrong place, which is exactly the mistake worth
 * discovering by yourself.
 */
function lineDone(line: readonly Mark[], clue: Clue): boolean {
  const runs: number[] = [];
  let run = 0;
  for (const mark of line) {
    if (mark === FILLED) {
      run += 1;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);

  return runs.length === clue.length && runs.every((value, i) => value === clue[i]);
}

function describe(row: number, col: number, mark: Mark): string {
  const what = mark === FILLED ? 'pintada' : mark === CROSSED ? 'descartada' : 'vacía';
  return `Fila ${String(row + 1)}, columna ${String(col + 1)}, ${what}`;
}
