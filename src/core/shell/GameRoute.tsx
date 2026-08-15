import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@design/components/Button';
import { Confetti } from '@design/components/Confetti';
import { DifficultyPicker } from '@design/components/DifficultyPicker';
import { Modal } from '@design/components/Modal';
import { Skeleton } from '@design/components/Skeleton';
import { Timer } from '@design/components/Timer';
import { useToast } from '@design/components/Toast';
import { ArrowLeftIcon } from '@design/sprites/SettingsIcons';
import { Trophy } from '@design/sprites/Trophy';

import { type Difficulty } from '../contract';
import { DIFFICULTY_LABELS, defaultDifficultyFor, difficultyOptions } from '../difficulty';
import { useGameSession } from '../hooks/useGameSession';
import { findEntry, type RegistryEntry } from '../registry';
import { AppShell } from './AppShell';
import { NotFound } from './NotFound';

import s from './GameRoute.module.css';

/**
 * Turns a URL into a running game. The shell owns the timer, the difficulty,
 * undo, hints and the outcome modal; the game owns its rules and its board.
 * Reference: docs/GAME_CONTRACT.md §5.
 */
export function GameRoute() {
  const { gameId } = useParams();
  const entry = gameId === undefined ? undefined : findEntry(gameId);

  if (!entry) return <NotFound />;

  // Keyed by id so switching games remounts the session instead of trying to
  // reconcile one game's state onto another's engine.
  return <GameSession key={entry.id} entry={entry} />;
}

function GameSession({ entry }: { entry: RegistryEntry }) {
  const session = useGameSession(entry.load, defaultDifficultyFor(entry.preview.difficulties));
  const navigate = useNavigate();
  const toast = useToast();

  // Which round's outcome the player already dismissed, so closing the modal
  // does not reopen it on the next render.
  const [dismissedRound, setDismissedRound] = useState<string | null>(null);

  const playing = session.status.kind === 'playing';
  const outcomeOpen = !playing && session.phase === 'ready' && dismissedRound !== session.roundId;

  const changeDifficulty = (next: Difficulty) => {
    session.setDifficulty(next);
    // The session may hold the change back for confirmation instead of taking
    // it, so announcing a new board here would be announcing something that
    // has not happened. The toast moves to where the change actually lands.
    if (session.pendingDifficulty === null && next !== session.difficulty) {
      toast.show(`Nueva partida en ${DIFFICULTY_LABELS[next]}`, { tone: 'info' });
    }
  };

  const header = (
    <>
      <Link to="/" className={s.back} aria-label="Volver al inicio">
        <ArrowLeftIcon />
      </Link>

      <span className={s.title}>{session.module?.meta.name ?? entry.preview.name}</span>

      <span className={s.headerEnd}>
        <Timer
          key={session.roundId}
          running={session.phase === 'ready' && playing}
          elapsedMs={session.elapsedMs}
        />
        <DifficultyPicker<Difficulty>
          value={session.difficulty}
          options={difficultyOptions(
            session.module?.meta.difficulties ?? entry.preview.difficulties
          )}
          onChange={changeDifficulty}
        />
      </span>
    </>
  );

  if (session.phase === 'error') {
    return (
      <AppShell header={header}>
        <p role="alert" className={s.message}>
          No se pudo cargar el juego. {session.error?.message}
        </p>
      </AppShell>
    );
  }

  if (session.phase === 'loading' || !session.module) {
    return (
      <AppShell header={header}>
        <div className={s.loading}>
          <Skeleton h="var(--sp-8)" label="Cargando el juego" />
          <Skeleton h="var(--sp-8)" />
        </div>
      </AppShell>
    );
  }

  const { View, actions = [] } = session.module;
  const won = session.status.kind === 'won';

  const footer = (
    <>
      <Button onClick={session.restart}>Nueva partida</Button>
      <Button onClick={session.undo} disabled={!session.canUndo}>
        Deshacer
      </Button>
      {session.canHint && <Button onClick={session.requestHint}>Pista</Button>}

      {actions.map((action) => {
        const ActionIcon = action.icon;
        return (
          <Button
            key={action.id}
            icon={<ActionIcon size={18} />}
            disabled={!playing}
            onClick={() => {
              const move = action.toMove?.();
              if (move !== undefined && move !== null) session.dispatch(move);
            }}
          >
            {action.label}
          </Button>
        );
      })}
    </>
  );

  return (
    <AppShell header={header} footer={footer} progress={session.progress}>
      <Confetti active={won} />

      <div className={s.stage}>
        {/* Remounting on every rejection is what replays the shake. */}
        <div
          key={session.rejection?.nonce ?? 'clean'}
          className={session.rejection ? 'anim-shake' : undefined}
        >
          <div className={won ? 'anim-win-burst' : undefined}>
            <View
              state={session.state}
              dispatch={session.dispatch}
              status={session.status}
              difficulty={session.difficulty}
              interactive={playing}
              hint={session.hint}
            />
          </div>
        </div>

        {/*
          In-play messages only — rejected moves and hints. The outcome is NOT
          repeated here: the modal's accessible name already announces it when
          it opens, and saying it twice makes a screen reader read the win
          twice over.
        */}
        <p className={s.live} role="status" aria-live="polite">
          {playing ? (session.rejection?.reason ?? session.hint?.message ?? '') : ''}
        </p>
      </div>

      <Modal
        open={session.pendingDifficulty !== null}
        onClose={session.cancelDifficulty}
        title="¿Cambiar la dificultad?"
        actions={
          <>
            <Button onClick={session.cancelDifficulty}>Seguir jugando</Button>
            <Button
              variant="danger"
              onClick={() => {
                const next = session.pendingDifficulty;
                session.confirmDifficulty();
                if (next !== null) {
                  toast.show(`Nueva partida en ${DIFFICULTY_LABELS[next]}`, { tone: 'info' });
                }
              }}
            >
              Empezar de nuevo
            </Button>
          </>
        }
      >
        {session.pendingDifficulty !== null && (
          <>
            Pasar a {DIFFICULTY_LABELS[session.pendingDifficulty]} empieza un tablero nuevo. Se
            pierde la partida que tenés en curso.
          </>
        )}
      </Modal>

      <Modal
        open={outcomeOpen}
        onClose={() => {
          setDismissedRound(session.roundId);
        }}
        title={won ? '¡Ganaste!' : 'Se terminó'}
        actions={
          <>
            <Button
              onClick={() => {
                void navigate('/');
              }}
            >
              Inicio
            </Button>
            <Button variant="primary" onClick={session.restart}>
              Jugar otra vez
            </Button>
          </>
        }
      >
        <span className={s.outcome}>
          {won && <Trophy size={32} state="unlocked" />}
          {won
            ? `Completado en ${DIFFICULTY_LABELS[session.difficulty]}.`
            : (session.status.kind === 'lost' && session.status.reason) || 'Probá de nuevo.'}
        </span>
      </Modal>
    </AppShell>
  );
}
