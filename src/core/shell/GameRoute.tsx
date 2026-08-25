import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';

import { Button } from '@design/components/Button';
import { Confetti } from '@design/components/Confetti';
import { DifficultyPicker } from '@design/components/DifficultyPicker';
import { Modal } from '@design/components/Modal';
import { Skeleton } from '@design/components/Skeleton';
import { Timer } from '@design/components/Timer';
import { useToast } from '@design/components/Toast';
import {
  ArrowLeftIcon,
  HintIcon,
  PlayIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from '@design/sprites/SettingsIcons';

import { type Difficulty } from '../contract';
import { DIFFICULTY_LABELS, defaultDifficultyFor, difficultyOptions } from '../difficulty';
import { useCampaign } from '../hooks/useCampaign';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useGameSession } from '../hooks/useGameSession';
import { findEntry, type TurnEntry } from '../registry';
import { AppShell } from './AppShell';
import { Examples } from './Examples';
import { OutcomeModal } from './OutcomeModal';
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

  // Un juego con reloj tiene otra maquinaria y vive en /arcade. Redirige en vez
  // de dar 404 para que un enlace viejo siga llevando a algún lado.
  if (entry.kind === 'reloj') return <Navigate to={`/arcade/${entry.id}`} replace />;

  // Keyed by id so switching games remounts the session instead of trying to
  // reconcile one game's state onto another's engine.
  return <GameSession key={entry.id} entry={entry} />;
}

function GameSession({ entry }: { entry: TurnEntry }) {
  /*
   * La campaña manda sobre esta partida solo si el juego que toca es este.
   * Entrando por la portada a otro juego, la campaña ni se entera — jugar
   * suelto sigue existiendo tal cual.
   */
  const { campaign, report } = useCampaign();
  const navigate = useNavigate();
  const inCampaign = campaign !== null && campaign.current === entry.id;

  const session = useGameSession(
    entry.load,
    inCampaign ? campaign.level : defaultDifficultyFor(entry.preview.difficulties),
    inCampaign
  );

  useDocumentMeta(
    entry.preview.name,
    `${entry.preview.tagline} Jugá gratis en el navegador, sin cuenta y sin conexión.`
  );
  const toast = useToast();

  // Which round's outcome the player already dismissed, so closing the modal
  // does not reopen it on the next render.
  const [dismissedRound, setDismissedRound] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  /*
   * Si esta partida cuenta para el historial.
   *
   * Va atado al modo y no a una bandera aparte porque las dos cosas se mueven
   * juntas: un modo que no puntúa tampoco tiene nivel que mostrar —dos personas
   * jugando entre sí no jugaron "en Difícil", jugaron entre ellas—, así que el
   * selector de dificultad se esconde con el mismo dato. Si algún día aparece
   * un modo que no puntúa pero sí escala, ahí se parte en dos banderas.
   */
  const modes = session.module?.meta.modes;
  const scored = modes?.find((one) => one.id === session.mode)?.ranked ?? true;

  const playing = session.status.kind === 'playing';

  /*
   * La ronda se reporta UNA sola vez, cuando termina.
   *
   * Va contra el id de la ronda y no contra un booleano porque el shell
   * remonta el tablero al reintentar, y sin esa guarda una misma victoria
   * contaría dos veces.
   */
  const reportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!inCampaign || playing || session.phase !== 'ready' || !session.started) return;
    if (reportedRef.current === session.roundId) return;
    reportedRef.current = session.roundId;

    const kind = session.status.kind;
    void report(kind === 'won' ? 'won' : kind === 'draw' ? 'draw' : 'lost');
  }, [
    inCampaign,
    playing,
    session.phase,
    session.started,
    session.roundId,
    session.status.kind,
    report,
  ]);
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
          running={session.started && session.phase === 'ready' && playing}
          elapsedMs={session.elapsedMs}
        />
      </span>
    </>
  );

  /* En campaña el nivel lo manda la campaña, así que el selector se va y en su
     lugar se ve en qué punto vas. */
  const subheader = inCampaign ? (
    <span className={s.campaignChip}>
      Campaña · {DIFFICULTY_LABELS[session.difficulty]} · {campaign.wins} de{' '}
      {campaign.config.winsPerLevel}
    </span>
  ) : scored ? (
    <DifficultyPicker<Difficulty>
      value={session.difficulty}
      options={difficultyOptions(session.module?.meta.difficulties ?? entry.preview.difficulties)}
      onChange={changeDifficulty}
    />
  ) : null;

  if (session.phase === 'error') {
    return (
      <AppShell header={header} subheader={subheader}>
        <p role="alert" className={s.message}>
          No se pudo cargar el juego. {session.error?.message}
        </p>
      </AppShell>
    );
  }

  if (session.phase === 'loading' || !session.module) {
    return (
      <AppShell header={header} subheader={subheader}>
        <div className={s.loading}>
          <Skeleton h="var(--sp-8)" label="Cargando el juego" />
          <Skeleton h="var(--sp-8)" />
        </div>
      </AppShell>
    );
  }

  const { View, actions = [] } = session.module;
  const won = session.status.kind === 'won';

  /*
   * Nothing of the board is rendered before the player starts — not hidden with
   * CSS, not rendered at all. A blurred board can still be read off the DOM, and
   * the whole point is that the puzzle cannot be studied while the clock is
   * stopped. It also gives them a moment to change the level or read the rules.
   */
  if (!session.started) {
    return (
      <AppShell header={header} subheader={subheader}>
        <div className={`${s.gate} anim-slide-up`}>
          <h2 className={s.gateTitle}>{session.module.meta.name}</h2>

          {modes !== undefined && modes.length > 1 && (
            <div className={s.modes} role="group" aria-label="Modo de juego">
              {modes.map((one) => (
                <Button
                  key={one.id}
                  variant={one.id === session.mode ? 'primary' : 'ghost'}
                  aria-pressed={one.id === session.mode}
                  onClick={() => {
                    session.setMode(one.id);
                  }}
                >
                  {one.label}
                </Button>
              ))}
            </div>
          )}

          {scored ? (
            <p className={s.gateLevel}>
              {session.resumed ? 'Tenés una partida a medias en ' : 'Vas a jugar en '}
              <strong>{DIFFICULTY_LABELS[session.difficulty]}</strong>
              {session.resumed ? '.' : '. Podés cambiar el nivel arriba antes de empezar.'}
            </p>
          ) : (
            <p className={s.gateLevel}>Esta partida no cuenta para tu historial ni tu racha.</p>
          )}

          <div className={s.gateActions}>
            <Button
              variant="primary"
              size="lg"
              block
              icon={<PlayIcon size={20} />}
              onClick={session.start}
            >
              {session.resumed ? 'Continuar partida' : 'Empezar partida'}
            </Button>

            {/* Only worth offering when there is something to abandon. */}
            {session.resumed && (
              <Button
                variant="accent"
                size="lg"
                block
                icon={<PlusIcon size={20} />}
                onClick={session.restart}
              >
                Nueva partida
              </Button>
            )}

            {/* The rules are one tap away, not in the way. Someone who already
                knows the game should not have to read past them every time. */}
            <Button
              size="lg"
              block
              icon={<HintIcon size={20} />}
              onClick={() => {
                setRulesOpen(true);
              }}
            >
              Cómo se juega
            </Button>
          </div>

          <p className={s.gateNote}>El reloj arranca cuando tocás el botón.</p>
        </div>

        <Modal
          open={rulesOpen}
          onClose={() => {
            setRulesOpen(false);
          }}
          title={`Cómo se juega ${session.module.meta.name}`}
          actions={
            <Button
              variant="primary"
              onClick={() => {
                setRulesOpen(false);
              }}
            >
              Entendido
            </Button>
          }
        >
          {/* Numbered, not bulleted: these are steps in an order, and a reader
              who stops halfway needs to know where they stopped. */}
          <ol className={s.rules}>
            {session.module.meta.howToPlay.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>

          {session.module.meta.examples !== undefined && (
            <Examples items={session.module.meta.examples} />
          )}
        </Modal>
      </AppShell>
    );
  }

  const footer = (
    <>
      {/* Icon + label. On a narrow screen the label is hidden by CSS and the
          aria-label carries the meaning — four labelled buttons wrapped to two
          rows and ate more height than the board could spare. */}
      <Button aria-label="Nueva partida" icon={<PlusIcon />} onClick={session.restart}>
        Nueva partida
      </Button>
      {session.module.meta.supportsUndo !== false && (
        <>
          <Button
            aria-label="Deshacer"
            icon={<UndoIcon />}
            onClick={session.undo}
            disabled={!session.canUndo}
          >
            Deshacer
          </Button>
          <Button
            aria-label="Rehacer"
            icon={<RedoIcon />}
            onClick={session.redo}
            disabled={!session.canRedo}
          >
            Rehacer
          </Button>
        </>
      )}
      {session.canHint && (
        <Button aria-label="Pista" icon={<HintIcon />} onClick={session.requestHint}>
          Pista
        </Button>
      )}

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
    <AppShell header={header} subheader={subheader} footer={footer} progress={session.progress}>
      <Confetti active={won} />

      <div className={`${s.stage} anim-view-in`}>
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
              rejection={
                session.rejection === null
                  ? null
                  : { reason: session.rejection.reason, cells: session.rejection.cells }
              }
            />
          </div>
        </div>

        {/*
          In-play messages only — rejected moves and hints. The outcome is NOT
          repeated here: the modal's accessible name already announces it when
          it opens, and saying it twice makes a screen reader read the win
          twice over.
        */}
        <div className={s.live} role="status" aria-live="polite">
          {playing && session.rejection && (
            <p className={`${s.notice} anim-pop-in`} data-tone="error">
              {session.rejection.reason}
            </p>
          )}
          {playing && !session.rejection && session.hint && (
            <p className={`${s.notice} anim-pop-in`} data-tone="hint">
              <HintIcon size={20} />
              {session.hint.message}
            </p>
          )}
        </div>
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

      <OutcomeModal
        open={outcomeOpen}
        onClose={() => {
          setDismissedRound(session.roundId);
        }}
        outcome={
          session.status.kind === 'won' ? 'won' : session.status.kind === 'draw' ? 'draw' : 'lost'
        }
        reason={
          session.status.kind === 'lost' || session.status.kind === 'draw'
            ? session.status.reason
            : undefined
        }
        winner={session.status.kind === 'won' ? session.status.winner : undefined}
        /* Sin puntaje, el nivel no significa nada: dos personas jugando entre
           sí no jugaron "en Difícil", jugaron entre ellas. */
        difficulty={scored ? session.difficulty : undefined}
        next={
          inCampaign
            ? { label: 'Seguir la campaña', onNext: () => void navigate('/campana') }
            : undefined
        }
        onRestart={session.restart}
      />
    </AppShell>
  );
}
