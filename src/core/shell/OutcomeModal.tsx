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
  won: boolean;
  /** Por qué terminó, si el juego lo explica. */
  reason?: string | undefined;
  difficulty: Difficulty;
  onRestart: () => void;
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
export function OutcomeModal({
  open,
  onClose,
  won,
  reason,
  difficulty,
  onRestart,
}: OutcomeModalProps) {
  const navigate = useNavigate();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={won ? '¡Ganaste!' : 'Se terminó'}
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
          <Button variant="primary" onClick={onRestart}>
            Jugar otra vez
          </Button>
        </>
      }
    >
      {won ? (
        <div className={s.victory}>
          {/* Grande y arriba del texto: el trofeo es el premio, no una viñeta
              al costado de una frase. La animación es la que ya trae. */}
          <Trophy size={96} state="unlocked" />
          <span className={s.victoryLine}>Completado en {DIFFICULTY_LABELS[difficulty]}</span>
        </div>
      ) : (
        <span className={s.outcome}>{reason ?? 'Probá de nuevo.'}</span>
      )}
    </Modal>
  );
}
