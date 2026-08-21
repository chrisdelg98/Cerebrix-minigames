import { type GameViewProps } from '@core/contract';
import { Cell } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';

import { type TicTacToeMove, type TicTacToeState } from '../engine/types';
import { MarkO, MarkX } from './Marks';

import s from './TicTacToeView.module.css';

const NAMES = [
  'arriba izquierda',
  'arriba centro',
  'arriba derecha',
  'izquierda',
  'centro',
  'derecha',
  'abajo izquierda',
  'abajo centro',
  'abajo derecha',
];

function describe(index: number, mark: 'x' | 'o' | null): string {
  const place = NAMES[index] ?? `casilla ${String(index + 1)}`;
  if (mark === null) return `${place}, vacía`;
  return `${place}, ${mark === 'x' ? 'equis' : 'círculo'}`;
}

export function TicTacToeView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<TicTacToeState, TicTacToeMove>) {
  const { board, turn, line, config } = state;
  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * 3 + (hint.cells[0]?.col ?? 0);

  /* De quién es el turno, dicho como corresponde según con quién jugás. Contra
     la máquina hay un "vos"; entre dos personas no lo hay. */
  const turnLabel = config.vsMachine
    ? turn === 'x'
      ? 'Te toca'
      : 'Piensa la máquina'
    : turn === 'x'
      ? 'Juegan las X'
      : 'Juegan las O';

  return (
    <div className={s.ticTacToe}>
      <p className={s.turn} aria-live="polite">
        <span className={s.turnMark} data-mark={turn} aria-hidden="true">
          {turn === 'x' ? <MarkX /> : <MarkO />}
        </span>
        {turnLabel}
      </p>

      <Grid cols={3} label="Tablero de Tres en línea" gap="var(--sp-2)" framed>
        {board.map((mark, index) => (
          <Cell
            key={index}
            state={index === hinted ? 'hint' : mark === null ? 'empty' : 'filled'}
            disabled={!interactive || mark !== null}
            label={describe(index, mark)}
            value={
              mark === null ? null : (
                <span
                  className={s.mark}
                  data-mark={mark}
                  data-winning={line?.includes(index) === true}
                >
                  {mark === 'x' ? <MarkX /> : <MarkO />}
                </span>
              )
            }
            onActivate={() => {
              dispatch({ cell: index });
            }}
          />
        ))}
      </Grid>
    </div>
  );
}
