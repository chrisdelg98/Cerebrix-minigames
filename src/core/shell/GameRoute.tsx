import { Link, useParams } from 'react-router-dom';

import { Button } from '@design/components/Button';
import { DifficultyPicker } from '@design/components/DifficultyPicker';
import { Skeleton } from '@design/components/Skeleton';
import { Timer } from '@design/components/Timer';

import { type Difficulty } from '../contract';
import { defaultDifficultyFor, difficultyOptions } from '../difficulty';
import { useGameSession } from '../hooks/useGameSession';
import { findEntry, type RegistryEntry } from '../registry';
import { AppShell } from './AppShell';
import { NotFound } from './NotFound';

import s from './GameRoute.module.css';

/**
 * Turns a URL into a running game. The shell owns the timer, the difficulty,
 * undo, hints and the terminal modal; the game owns its rules and its board.
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
  const playing = session.status.kind === 'playing';

  const header = (
    <>
      <Link to="/" className={s.back} aria-label="Volver al inicio">
        ←
      </Link>

      <span className={s.title}>{session.module?.meta.name ?? entry.preview.name}</span>

      <span className={s.headerEnd}>
        <Timer key={session.roundId} running={session.phase === 'ready' && playing} />
        <DifficultyPicker<Difficulty>
          value={session.difficulty}
          options={difficultyOptions(
            session.module?.meta.difficulties ?? entry.preview.difficulties
          )}
          onChange={session.setDifficulty}
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
      <div className={s.stage}>
        {/* Remounting on every rejection is what replays the shake. */}
        <div
          key={session.rejection?.nonce ?? 'clean'}
          className={session.rejection ? 'anim-shake' : undefined}
        >
          <View
            state={session.state}
            dispatch={session.dispatch}
            status={session.status}
            difficulty={session.difficulty}
            interactive={playing}
            hint={session.hint}
          />
        </div>

        {/* The shell is the only voice: rules, hints and outcome all announce here. */}
        <p className={s.live} role="status" aria-live="polite">
          {session.status.kind === 'won' && '¡Ganaste!'}
          {session.status.kind === 'lost' && `Perdiste. ${session.status.reason ?? ''}`}
          {playing && (session.rejection?.reason ?? session.hint?.message ?? '')}
        </p>

        {!playing && (
          <Button variant="primary" onClick={session.restart}>
            Jugar otra vez
          </Button>
        )}
      </div>
    </AppShell>
  );
}
