import { type GameViewProps } from '@core/contract';
import { Cell, type BlockEdge, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';
import { type CSSVars } from '@design/types';

import { violations } from '../engine/solve';
import {
  EMPTY,
  MARK,
  QUEEN,
  type Cell as Value,
  type QueensMove,
  type QueensState,
} from '../engine/types';
import { CrownGlyph } from '../sprites/QueensIcons';

import s from './QueensView.module.css';

/** Vacía → ✕ → corona → vacía. Un toque para descartar, dos para coronar. */
const NEXT: Record<Value, Value> = { [EMPTY]: MARK, [MARK]: QUEEN, [QUEEN]: EMPTY };

export function QueensView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<QueensState, QueensMove>) {
  const { size, regions, marks } = state;
  const wrong = new Set(violations(marks, regions, size));
  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * size + (hint.cells[0]?.col ?? 0);

  return (
    /* Un tablero chico tiene casillas grandes, y ahí la misma proporción se
       vuelve un dibujo enorme. La corona baja de tamaño relativo al crecer. */
    <div className={s.queens} style={{ '--crown': size <= 6 ? '60%' : '70%' } as CSSVars}>
      <Grid cols={size} label="Tablero de Queens" gap="0px" framed>
        {marks.map((value, index) => {
          const region = regions[index] ?? 0;

          return (
            /*
             * El envoltorio existe solo para llevar el color de la región hasta
             * `--cell-bg`, que <Cell> expone como perilla. Con `display:
             * contents` no aparece en la grilla — la celda sigue siendo el
             * elemento de la grilla — pero sí en el árbol, que es lo único que
             * necesita una custom property para heredar.
             */
            <span
              key={index}
              className={s.region}
              style={{ '--cell-bg': `var(--c-region-${String(region + 1)})` } as CSSVars}
            >
              <Cell
                state={cellState(value, wrong.has(index), index === hinted)}
                blockEdges={edgesFor(index, regions, size)}
                disabled={!interactive}
                label={describe(index, size, value)}
                value={
                  value === QUEEN ? (
                    <CrownGlyph />
                  ) : value === MARK ? (
                    <span className={s.mark}>✕</span>
                  ) : undefined
                }
                onActivate={() => {
                  dispatch({ index, value: NEXT[value] });
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  // Al revés, para llegar a la corona de un toque.
                  dispatch({ index, value: value === QUEEN ? EMPTY : QUEEN });
                }}
              />
            </span>
          );
        })}
      </Grid>
    </div>
  );
}

/**
 * Un lado grueso donde el vecino es de otra región.
 *
 * `blockEdges` estaba en <Cell> desde las cajas de 3×3 del Sudoku y resultó ser
 * exactamente esto, sin tocarle una línea: preguntarle a cada lado si del otro
 * hay algo distinto. Las formas irregulares salieron gratis.
 */
function edgesFor(index: number, regions: readonly number[], size: number): BlockEdge[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const mine = regions[index];
  const edges: BlockEdge[] = [];

  if (row === 0 || regions[index - size] !== mine) edges.push('top');
  if (col === 0 || regions[index - 1] !== mine) edges.push('left');
  if (row === size - 1 || regions[index + size] !== mine) edges.push('bottom');
  if (col === size - 1 || regions[index + 1] !== mine) edges.push('right');

  return edges;
}

function cellState(value: Value, bad: boolean, hinted: boolean): CellState {
  if (hinted) return 'hint';
  if (bad) return 'error';
  return value === QUEEN ? 'filled' : 'empty';
}

function describe(index: number, size: number, value: Value): string {
  const row = Math.floor(index / size) + 1;
  const col = (index % size) + 1;
  const what = value === QUEEN ? 'corona' : value === MARK ? 'descartada' : 'vacía';
  return `Fila ${String(row)}, columna ${String(col)}, ${what}`;
}
