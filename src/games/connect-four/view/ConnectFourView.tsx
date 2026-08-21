import { type GameViewProps } from '@core/contract';
import { type CSSVars } from '@design/types';

import { landing } from '../engine/search';
import {
  type ConnectFourMove,
  type ConnectFourState,
  type Disc,
  COLS,
  ROWS,
} from '../engine/types';

import s from './ConnectFourView.module.css';

const ROW_LIST = Array.from({ length: ROWS }, (_, i) => i);
const COL_LIST = Array.from({ length: COLS }, (_, i) => i);

function describe(col: number, board: (Disc | null)[]): string {
  const row = landing(board, col);
  if (row < 0) return `Columna ${String(col + 1)}, llena`;
  return `Columna ${String(col + 1)}, quedan ${String(row + 1)} lugares`;
}

export function ConnectFourView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<ConnectFourState, ConnectFourMove>) {
  const { board, turn, line, last, config } = state;
  const hinted = hint?.cells[0]?.col ?? -1;

  const turnLabel = config.vsMachine
    ? turn === 'red'
      ? 'Te toca'
      : 'Piensa la máquina'
    : turn === 'red'
      ? 'Juegan las rojas'
      : 'Juegan las amarillas';

  return (
    <div className={s.connectFour}>
      <p className={s.turn} aria-live="polite">
        <span className={s.turnDisc} data-disc={turn} aria-hidden="true" />
        {turnLabel}
      </p>

      {/*
        La columna entera es el botón, no cada casilla.
        Es la entrada más perdonadora que existe en un teléfono: un objetivo de
        un séptimo del ancho por todo el alto, contra los 36px que tendría una
        casilla suelta. Y coincide con la regla del juego — no elegís dónde cae
        la ficha, elegís por dónde la tirás.
      */}
      <div className={s.board} role="group" aria-label="Tablero de Conecta 4">
        {COL_LIST.map((col) => (
          <button
            key={col}
            type="button"
            className={s.column}
            data-hinted={col === hinted}
            disabled={!interactive || landing(board, col) < 0}
            aria-label={describe(col, board)}
            onClick={() => {
              dispatch({ column: col });
            }}
          >
            {ROW_LIST.map((row) => {
              const cell = row * COLS + col;
              const disc = board[cell];
              return (
                <span key={row} className={s.slot}>
                  {disc !== null && disc !== undefined && (
                    <span
                      className={`${s.disc} ${cell === last ? 'anim-drop-in' : ''}`}
                      data-disc={disc}
                      data-winning={line?.includes(cell) === true}
                      style={{ '--fall': row + 1 } as CSSVars}
                    />
                  )}
                </span>
              );
            })}
          </button>
        ))}
      </div>
    </div>
  );
}
