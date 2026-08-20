import { useEffect } from 'react';

import { type ArcadeViewProps } from '@core/arcade';
import { type CSSVars } from '@design/types';

import { LEVEL_TARGETS } from '../engine/stackEngine';
import { type StackMove, type StackState } from '../engine/types';

import s from './StackView.module.css';

/**
 * Cuántos pisos entran en pantalla a la vez.
 *
 * Nueve y no más: con el tablero más alto la torre arranca en un mar de blanco
 * y las piezas quedan finitas. Nueve deja lugar para ver crecer y aun así cada
 * bloque tiene cuerpo.
 */
const VISIBLE = 9;

/** Lo más arriba que la cima puede llegar antes de que la cámara empiece a subir. */
const CEILING_ROW = 2;

/**
 * Los tonos, en orden CROMÁTICO y no por contraste.
 *
 * Caminan alrededor del círculo de color en vez de saltar entre colores
 * distintos: teal → celeste → índigo → violeta, y recién al final el rojo y el
 * oro para los tramos que superan la meta del nivel más alto. El violeta
 * después del azul y no antes — un salto de tono chico entre tramos hace que el
 * cambio se sienta como una progresión y no como otro juego.
 *
 * Son los `--c-trace-*` que ya usa Trazo, reordenados.
 */
const TONES = [
  'var(--c-trace-1)',
  'var(--c-trace-5)',
  'var(--c-trace-2)',
  'var(--c-trace-4)',
  'var(--c-trace-6)',
  'var(--c-gold)',
];

/** Cuántas metas dejó atrás una altura. Es el tramo al que pertenece. */
function bandOf(floor: number): number {
  return LEVEL_TARGETS.filter((target) => floor >= target).length;
}

export function StackView({
  state,
  dispatch,
  interactive,
}: ArcadeViewProps<StackState, StackMove>) {
  const drop = () => {
    if (interactive) dispatch({ kind: 'drop' });
  };

  useEffect(() => {
    if (!interactive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      dispatch({ kind: 'drop' });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [interactive, dispatch]);

  const { slots, tower, moving, target } = state;
  const height = tower.length - 1;

  /*
   * La torre crece desde ABAJO, y la cámara solo entra cuando hace falta.
   *
   * Al principio la base se apoya en el piso del tablero y los pisos suben; el
   * jugador ve cuánto lleva construido. Recién cuando la cima llega al techo la
   * cámara empieza a subir y los primeros pisos salen por abajo — que es cuando
   * la altura deja de caber y mostrarla entera pierde sentido.
   *
   * Cada pieza se identifica por su altura y se ubica por su fila en pantalla,
   * así que un paneo es un transform por pieza y la transición lo hace continuo.
   */
  /*
   * TODA la torre lleva el tono del tramo alcanzado, no cada piso el suyo.
   *
   * Antes cada piso pintaba su propio tramo y la carga se reiniciaba en cada
   * frontera: un tramo terminaba saturado y el siguiente arrancaba clarito,
   * justo pegados. El corte se veía como un error de dibujo, no como un logro.
   *
   * Cambiando la torre entera de una, cruzar una meta se nota muchísimo más y
   * no queda ninguna costura — y como la transición de CSS anima el color, el
   * cambio se desliza en vez de saltar.
   */
  const band = bandOf(Math.max(0, tower.length - 1));
  const tone = TONES[band] ?? TONES[0];

  /*
   * La carga corre a lo largo de TODA la torre, del pie a la cima, sin
   * reiniciarse. Y arranca en 72 y no en 52: por debajo de eso el tono se
   * lavaba contra el gris y los primeros pisos parecían sin pintar.
   */
  const tintOf = (floor: number) =>
    `${String(Math.round(72 + (floor / Math.max(1, tower.length - 1)) * 28))}%`;

  const camera = Math.max(0, CEILING_ROW - (VISIBLE - tower.length));
  const rowOf = (floor: number) => VISIBLE - 1 - floor + camera;

  const shown = tower
    .map((piece, floor) => ({ piece, floor, row: rowOf(floor) }))
    .filter(({ row }) => row >= -1 && row < VISIBLE + 1);

  // El que se desliza va siempre justo encima de la cima.
  const movingRow = rowOf(tower.length - 1) - 1;

  return (
    <div className={s.stack}>
      <p className={s.hud}>
        <span className={s.label}>Pisos</span>
        <span className="tabular">{height}</span>
        <span className={s.label}>Meta</span>
        <span className="tabular">{target}</span>
        {state.streak > 1 && <span className={s.streak}>×{state.streak} perfectos</span>}
      </p>

      <div className={s.frame} style={{ '--slots': slots, '--rows': VISIBLE } as CSSVars}>
        {/*
          El tablero entero es el botón. La mecánica es una sola decisión —
          soltar— y pedir puntería para soltar sería un segundo desafío que el
          juego no propone.
        */}
        <button
          type="button"
          className={s.field}
          data-dead={state.dead}
          aria-label={`Soltar. ${String(height)} de ${String(target)} pisos.`}
          disabled={!interactive}
          onPointerDown={(event) => {
            event.preventDefault();
            drop();
          }}
        >
          {shown.map(({ piece, floor, row }) => (
            <span
              key={floor}
              className={s.piece}
              style={
                {
                  '--x': piece.start,
                  '--w': piece.width,
                  '--row': row,
                  // El tono sube con la altura: se ve cuánto se lleva subido sin
                  // leer el número.
                  '--tone': tone,
                  '--tint': tintOf(floor),
                } as CSSVars
              }
              aria-hidden="true"
            />
          ))}

          {!state.dead && (
            <span
              className={s.moving}
              style={
                {
                  '--x': moving.start,
                  '--w': moving.width,
                  '--row': movingRow,
                  '--tone': tone,
                } as CSSVars
              }
              aria-hidden="true"
            />
          )}
        </button>
      </div>

      <p className={s.help}>
        {state.dead ? 'No quedó dónde apoyar.' : 'Tocá para soltar el bloque donde calce.'}
      </p>
    </div>
  );
}
