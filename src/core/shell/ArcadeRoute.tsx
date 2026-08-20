import { useState } from 'react';

import { Button } from '@design/components/Button';
import { Confetti } from '@design/components/Confetti';
import { DifficultyPicker } from '@design/components/DifficultyPicker';
import { Modal } from '@design/components/Modal';
import { Skeleton } from '@design/components/Skeleton';
import { Timer } from '@design/components/Timer';
import { ArrowLeftIcon, PlayIcon, PlusIcon } from '@design/sprites/SettingsIcons';
import { Trophy } from '@design/sprites/Trophy';

import { type Difficulty } from '../contract';
import { defaultDifficultyFor, difficultyOptions } from '../difficulty';
import { useArcadeSession } from '../hooks/useArcadeSession';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { findEntry, type ClockEntry } from '../registry';
import { AppShell } from './AppShell';
import { NotFound } from './NotFound';
import { Link, useParams } from 'react-router-dom';

import s from './ArcadeRoute.module.css';

/**
 * El gemelo de `GameRoute` para los juegos que corren solos.
 *
 * Comparte todo lo visual —el encabezado, el selector de dificultad, el modal
 * de resultado, los botones— porque un arcade tiene que sentirse parte de la
 * misma app. Lo que no comparte es la maquinaria: acá no hay deshacer, ni
 * pista, ni partida guardada, y sí hay una pausa.
 */
export function ArcadeRoute() {
  const { gameId } = useParams();
  const entry = gameId === undefined ? undefined : findEntry(gameId);

  if (!entry || entry.kind !== 'reloj') return <NotFound />;

  return <ArcadeSession key={entry.id} entry={entry} />;
}

function ArcadeSession({ entry }: { entry: ClockEntry }) {
  const session = useArcadeSession(entry.load, defaultDifficultyFor(entry.preview.difficulties));

  useDocumentMeta(
    entry.preview.name,
    `${entry.preview.tagline} Jugá gratis en el navegador, sin cuenta y sin conexión.`
  );

  const [dismissed, setDismissed] = useState<string | null>(null);
  const playing = session.status.kind === 'playing';
  const won = session.status.kind === 'won';
  const over = !playing && session.phase === 'ready' && session.started;
  const outcomeOpen = over && dismissed !== session.roundId;

  const header = (
    <>
      <Link to="/" className={s.back} aria-label="Volver al inicio">
        <ArrowLeftIcon />
      </Link>

      <span className={s.title}>{session.module?.meta.name ?? entry.preview.name}</span>

      <span className={s.headerEnd}>
        <Timer
          key={session.roundId}
          running={session.started && playing && !session.paused}
          elapsedMs={0}
        />
      </span>
    </>
  );

  const subheader = (
    <DifficultyPicker<Difficulty>
      value={session.difficulty}
      options={difficultyOptions(session.module?.meta.difficulties ?? entry.preview.difficulties)}
      onChange={(next: Difficulty) => {
        session.setDifficulty(next);
      }}
    />
  );

  if (session.phase === 'error') {
    return (
      <AppShell header={header} subheader={subheader}>
        <p role="alert" className={s.message}>
          No se pudo cargar el juego.
        </p>
      </AppShell>
    );
  }

  if (session.phase === 'loading' || session.module === null) {
    return (
      <AppShell header={header} subheader={subheader}>
        <div className={s.loading}>
          <Skeleton h="var(--sp-8)" label="Cargando el juego" />
        </div>
      </AppShell>
    );
  }

  const { View, meta } = session.module;

  /* Antes de empezar: las reglas. Un arcade que arranca en el momento en que
     carga la página no te da tiempo ni a leer hacia dónde vas. */
  if (!session.started) {
    return (
      <AppShell header={header} subheader={subheader}>
        <div className={`${s.intro} anim-slide-up`}>
          <ul className={s.rules}>
            {meta.howToPlay.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {meta.examples !== undefined && (
            <div className={s.examples}>
              {meta.examples.map(({ figure: Figure, caption }) => (
                <figure key={caption} className={s.example}>
                  <Figure />
                  <figcaption>{caption}</figcaption>
                </figure>
              ))}
            </div>
          )}

          <Button variant="primary" size="lg" icon={<PlayIcon />} onClick={session.start}>
            Empezar partida
          </Button>
        </div>
      </AppShell>
    );
  }

  const footer = (
    <>
      {playing && (
        <Button
          aria-label={session.paused ? 'Seguir' : 'Pausa'}
          onClick={session.paused ? session.resume : session.pause}
        >
          {session.paused ? 'Seguir' : 'Pausa'}
        </Button>
      )}
      <Button aria-label="Nueva partida" icon={<PlusIcon />} onClick={session.restart}>
        Nueva partida
      </Button>
    </>
  );

  return (
    <AppShell header={header} subheader={subheader} footer={footer} progress={session.progress}>
      <Confetti active={won} />

      <div className={s.stage}>
        <View
          state={session.state}
          dispatch={session.dispatch}
          status={session.status}
          difficulty={session.difficulty}
          interactive={playing && !session.paused}
          stepMs={session.stepMs}
        />
      </div>

      {/*
        La pausa tapa el tablero a propósito. Dejarlo a la vista congelado sería
        un botón de trampa: en un juego de reflejos, mirar la pantalla quieta el
        tiempo que quieras es exactamente lo que el juego no ofrece.
      */}
      <Modal open={session.paused && playing} onClose={session.resume} title="En pausa">
        <p className={s.message}>El tablero espera. Nada se mueve hasta que vuelvas.</p>
        <Button variant="primary" icon={<PlayIcon />} onClick={session.resume}>
          Seguir jugando
        </Button>
      </Modal>

      <Modal
        open={outcomeOpen}
        onClose={() => {
          setDismissed(session.roundId);
        }}
        title={won ? '¡Ganaste!' : 'Se terminó'}
        centered={won}
      >
        {won && <Trophy size={96} state="unlocked" />}
        <p className={s.message}>
          {won
            ? '¡Llegaste a la meta!'
            : (session.status.kind === 'lost' && session.status.reason) || 'Probá de nuevo.'}
        </p>
        <Button variant="primary" icon={<PlusIcon />} onClick={session.restart}>
          Otra vez
        </Button>
      </Modal>
    </AppShell>
  );
}
