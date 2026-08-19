import { useEffect, useRef } from 'react';

import { type GameViewProps } from '@core/contract';
import { Grid } from '@design/components/Grid';
import { type CSSVars } from '@design/types';

import { type Direction, type Game2048Move, type Game2048State } from '../engine/types';

import s from './Game2048View.module.css';

/** Cuánto hay que arrastrar para que cuente como deslizamiento y no como toque. */
const SWIPE_MIN_PX = 24;

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

export function Game2048View({
  state,
  dispatch,
  interactive,
}: GameViewProps<Game2048State, Game2048Move>) {
  const from = useRef<{ x: number; y: number } | null>(null);
  const best = state.tiles.reduce((max, value) => (value > max ? value : max), 0);

  /*
   * El teclado se escucha en la ventana y no en el tablero.
   *
   * Acá la jugada es del tablero entero, no de una casilla, así que no hay nada
   * que enfocar: pedirle al jugador que haga clic antes de poder usar las
   * flechas sería una traba inventada. Se apaga solo cuando el shell dice que
   * no se puede jugar — con el modal de resultado abierto, las flechas vuelven
   * a ser de la página.
   */
  useEffect(() => {
    if (!interactive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const dir = KEYS[event.key];
      if (dir === undefined || event.metaKey || event.ctrlKey || event.altKey) return;
      // Si no, las flechas además scrollean la página bajo el tablero.
      event.preventDefault();
      dispatch({ dir });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [interactive, dispatch]);

  const onPointerUp = (event: React.PointerEvent) => {
    const start = from.current;
    from.current = null;
    if (!interactive || start === null) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Gana el eje que más se movió: un deslizamiento en diagonal es siempre uno
    // de los dos, nunca los dos ni ninguno.
    const horizontal = Math.abs(dx) > Math.abs(dy);
    const travelled = horizontal ? dx : dy;
    if (Math.abs(travelled) < SWIPE_MIN_PX) return;

    if (horizontal) dispatch({ dir: dx > 0 ? 'right' : 'left' });
    else dispatch({ dir: dy > 0 ? 'down' : 'up' });
  };

  return (
    <div className={s.game}>
      {/*
        Los puntos y la meta son magnitudes DISTINTAS y se muestran distinto.
        Puestos como dos números iguales al lado se leían como lo mismo — y con
        puntajes que son sumas de potencias de dos y metas que son potencias de
        dos, coincidir es habitual: «puntos 256, meta 256» con la mejor ficha en
        32 parecía una partida ganada que el juego no daba por ganada. La meta
        se cuenta en fichas, así que se dibuja como una ficha.
      */}
      <div className={s.hud}>
        <p className={s.stat}>
          <span className={s.statLabel}>Puntos</span>
          <span className={`${s.statValue} tabular`}>{state.score}</span>
        </p>

        <p className={s.stat}>
          <span className={s.statLabel}>Ficha</span>
          <TileChip value={best} />
          <span className={s.of}>de</span>
          <TileChip value={state.target} />
        </p>
      </div>

      <div
        className={s.board}
        onPointerDown={(event) => {
          from.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          from.current = null;
        }}
      >
        <Grid cols={state.size} label="Tablero de 2048" gap="var(--sp-2)" framed>
          {state.tiles.map((value, index) => (
            <div
              key={index}
              role="gridcell"
              className={s.tile}
              // El nivel es el exponente, no el valor: es lo que hace que la
              // rampa de color avance un paso por fusión y no a los saltos.
              style={{ '--level': value === 0 ? 0 : Math.log2(value) } as CSSVars}
              data-empty={value === 0}
              data-strong={value >= 64}
              data-digits={String(value).length}
              aria-label={describe(index, state.size, value)}
            >
              {value === 0 ? '' : value}
            </div>
          ))}
        </Grid>
      </div>

      <p className={s.help}>Deslizá sobre el tablero, o usá las flechas.</p>
    </div>
  );
}

/** La meta y el mejor logro, con el aspecto que tienen en el tablero. */
function TileChip({ value }: { value: number }) {
  return (
    <span
      className={s.chip}
      style={{ '--level': value === 0 ? 0 : Math.log2(value) } as CSSVars}
      data-strong={value >= 64}
      data-digits={String(value).length}
    >
      {value}
    </span>
  );
}

function describe(index: number, size: number, value: number): string {
  const row = Math.floor(index / size) + 1;
  const col = (index % size) + 1;
  const what = value === 0 ? 'vacía' : String(value);
  return `fila ${String(row)}, columna ${String(col)}, ${what}`;
}
