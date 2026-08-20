import { type GameViewProps } from '@core/contract';
import { Cell, type CellState } from '@design/components/Cell';
import { Grid } from '@design/components/Grid';

import { type ApagonMove, type ApagonState } from '../engine/types';

import s from './ApagonView.module.css';

export function ApagonView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<ApagonState, ApagonMove>) {
  const { size, lights } = state;
  const hinted = hint === null ? -1 : (hint.cells[0]?.row ?? 0) * size + (hint.cells[0]?.col ?? 0);
  const on = lights.filter(Boolean).length;

  return (
    <div className={s.apagon}>
      <p className={s.count} aria-live="polite">
        <span className={s.label}>Encendidas</span>
        <span className="tabular">{on}</span>
        <span className={s.label}>Toques</span>
        <span className="tabular">{state.moves}</span>
      </p>

      <Grid cols={size} label="Tablero de Lights Out" gap="var(--sp-2)" framed>
        {lights.map((lit, index) => (
          <Cell
            key={index}
            state={cellState(lit, index === hinted)}
            disabled={!interactive}
            label={describe(index, size, lit)}
            value={<span className={s.bulb} data-lit={lit} aria-hidden="true" />}
            onActivate={() => {
              dispatch({ index });
            }}
          />
        ))}
      </Grid>

      <p className={s.help}>Cada toque cambia la casilla y sus cuatro vecinas.</p>
    </div>
  );
}

/*
 * La pista gana sobre el estado de la luz.
 *
 * Es el único momento en que importa más señalar una casilla que decir si está
 * prendida — y eso el jugador lo sigue viendo en el foquito, que no cambia.
 */
function cellState(lit: boolean, hinted: boolean): CellState {
  if (hinted) return 'hint';
  return lit ? 'filled' : 'empty';
}

function describe(index: number, size: number, lit: boolean): string {
  const row = Math.floor(index / size) + 1;
  const col = (index % size) + 1;
  return `Fila ${String(row)}, columna ${String(col)}, ${lit ? 'encendida' : 'apagada'}`;
}
