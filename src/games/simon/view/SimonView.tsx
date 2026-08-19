import { useEffect, useRef, useState } from 'react';

import { type GameViewProps } from '@core/contract';
import { type CSSVars } from '@design/types';

import { type SimonMove, type SimonState } from '../engine/types';

import s from './SimonView.module.css';

/**
 * Lo que espera antes de empezar a mostrar.
 *
 * Eran 400 ms y arrancaba prácticamente encima del último toque del jugador:
 * el primer destello caía mientras la mano todavía estaba en la pantalla y se
 * perdía. La pausa no es tiempo muerto — es lo que separa "te toca a vos" de
 * "mirá", y sin ella las dos mitades del juego se pisan.
 */
const LEAD_IN_MS = 900;

export function SimonView({
  state,
  dispatch,
  interactive,
  hint,
}: GameViewProps<SimonState, SimonMove>) {
  const [lit, setLit] = useState(-1);
  /*
   * Qué ronda ya terminó de mostrarse, en vez de un "estoy mostrando".
   *
   * `react-hooks/set-state-in-effect` prohíbe escribir estado en el cuerpo de
   * un efecto, y con razón: encender la bandera ahí es pedir un segundo
   * renderizado para algo que se puede deducir. Comparando la ronda que ya se
   * mostró con la actual, la respuesta sale del propio renderizado.
   */
  const [shownRound, setShownRound] = useState(-1);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { pads, sequence, round, tempoMs } = state;
  const hinted = hint === null ? -1 : (hint.cells[0]?.col ?? -1);

  /*
   * El único reloj del juego, y vive acá.
   *
   * El motor es lógica pura y no sabe que existe el tiempo: lo que ve es una
   * pulsación tras otra. Mostrar la secuencia es un asunto de la vista, igual
   * que el temporizador que vuelve a tapar un par en Memoria.
   *
   * Se reprograma con cada ronda, y se limpia entero al salir — si no, una
   * partida nueva heredaría los destellos de la anterior.
   */
  useEffect(() => {
    if (!interactive) return;

    const steps = sequence.slice(0, round);

    // Apaga lo que haya quedado encendido de la ronda anterior.
    timers.current.push(
      setTimeout(() => {
        setLit(-1);
      }, 0)
    );

    steps.forEach((pad, i) => {
      timers.current.push(
        setTimeout(
          () => {
            setLit(pad);
          },
          i * tempoMs + LEAD_IN_MS
        )
      );
      timers.current.push(
        setTimeout(
          () => {
            setLit(-1);
          },
          i * tempoMs + LEAD_IN_MS + tempoMs * 0.62
        )
      );
    });

    timers.current.push(
      setTimeout(
        () => {
          setShownRound(round);
        },
        steps.length * tempoMs + LEAD_IN_MS
      )
    );

    return () => {
      for (const timer of timers.current) clearTimeout(timer);
      timers.current = [];
    };
  }, [round, sequence, tempoMs, interactive]);

  const busy = shownRound !== round || !interactive;

  return (
    <div className={s.simon}>
      <p className={s.status} aria-live="polite">
        {busy
          ? 'Mirá la secuencia…'
          : `Repetila: paso ${String(state.progress + 1)} de ${String(round)}`}
      </p>

      <div className={s.pads} data-pads={pads} role="group" aria-label="Pastillas">
        {Array.from({ length: pads }, (_, pad) => (
          <button
            key={pad}
            type="button"
            className={s.pad}
            style={{ '--pad': `var(--c-trace-${String(pad + 1)})` } as CSSVars}
            data-lit={lit === pad}
            data-hinted={hinted === pad}
            disabled={busy}
            aria-label={`Pastilla ${String(pad + 1)}`}
            onPointerDown={() => {
              if (busy) return;
              // El destello sale de la vista y no del estado: es acuse de
              // recibo del dedo, no una jugada distinta.
              setLit(pad);
              timers.current.push(
                setTimeout(() => {
                  setLit(-1);
                }, 180)
              );
              dispatch({ pad });
            }}
          />
        ))}
      </div>

      <p className={s.round}>
        Ronda <span className="tabular">{Math.min(round, state.target)}</span> de{' '}
        <span className="tabular">{state.target}</span>
      </p>
    </div>
  );
}
