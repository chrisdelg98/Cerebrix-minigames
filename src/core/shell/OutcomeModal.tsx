import { useNavigate } from 'react-router-dom';

import { Button } from '@design/components/Button';
import { Modal } from '@design/components/Modal';
import { Trophy } from '@design/sprites/Trophy';

import { type Difficulty } from '../contract';
import { DIFFICULTY_LABELS } from '../difficulty';

import s from './OutcomeModal.module.css';

export interface OutcomeModalProps {
  open: boolean;
  onClose: () => void;
  outcome: 'won' | 'lost' | 'draw';
  /** Por qué terminó, si el juego lo explica. */
  reason?: string | undefined;
  /**
   * El título de la victoria, cuando "¡Ganaste!" no aplica.
   *
   * Es una frase completa —"Ganan las X"— y no un nombre, para que el shell no
   * tenga que construir la oración. En un juego de dos personas en el mismo
   * aparato el shell no sabe cuál de las dos está mirando la pantalla, así que
   * no puede tutear a ninguna; el juego, que sí sabe quién puso qué, escribe la
   * línea entera.
   */
  winner?: string | undefined;
  /**
   * El nivel al que se jugó, o `undefined` cuando no significa nada — dos
   * personas jugando entre sí no jugaron "en Difícil", jugaron entre ellas.
   */
  difficulty?: Difficulty | undefined;
  onRestart: () => void;
  /**
   * En campaña la partida no se repite: se sigue. El shell pasa qué viene y a
   * dónde ir, y el modal cambia el botón sin saber qué es una campaña.
   */
  next?: { label: string; onNext: () => void } | undefined;
}

/**
 * Cómo termina una partida. UNA sola vez, para los doce juegos.
 *
 * Estaba escrito dos veces —una en GameRoute y otra en ArcadeRoute— y se notaba:
 * los juegos por turnos ofrecían volver al inicio y jugar de nuevo, y los de
 * reloj solo "otra vez"; uno mostraba el trofeo y el nivel, el otro una frase
 * suelta. Perder no puede sentirse distinto según qué motor tenga el juego, y el
 * jugador no sabe ni debería saber que hay dos.
 */
const TITLES = {
  won: '¡Ganaste!',
  lost: 'Se terminó',
  draw: 'Empate',
} as const;

export function OutcomeModal({
  open,
  onClose,
  outcome,
  reason,
  winner,
  difficulty,
  onRestart,
  next,
}: OutcomeModalProps) {
  const navigate = useNavigate();
  const won = outcome === 'won';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={won && winner !== undefined ? winner : TITLES[outcome]}
      centered={won}
      /* Un clic distraído en cualquier parte borraba el resultado antes de
         poder leerlo. La cruz y Esc siguen estando. */
      dismissOnBackdrop={false}
      actions={
        <>
          <Button
            onClick={() => {
              void navigate('/');
            }}
          >
            Inicio
          </Button>
          {next === undefined ? (
            <Button variant="primary" onClick={onRestart}>
              Jugar otra vez
            </Button>
          ) : (
            <Button variant="primary" onClick={next.onNext}>
              {next.label}
            </Button>
          )}
        </>
      }
    >
      {won ? (
        <div className={s.victory}>
          {/* Grande y arriba del texto: el trofeo es el premio, no una viñeta
              al costado de una frase. La animación es la que ya trae. */}
          <Trophy size={96} state="unlocked" />
          {difficulty !== undefined && (
            <span className={s.victoryLine}>Completado en {DIFFICULTY_LABELS[difficulty]}</span>
          )}
        </div>
      ) : (
        <span className={s.outcome}>
          {reason ??
            (outcome === 'draw' ? 'Nadie ganó. La racha queda como está.' : 'Probá de nuevo.')}
        </span>
      )}
    </Modal>
  );
}
