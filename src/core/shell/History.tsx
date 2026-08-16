import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { EmptyState } from '@design/components/EmptyState';
import { Skeleton } from '@design/components/Skeleton';
import { ArrowLeftIcon } from '@design/sprites/SettingsIcons';
import { Trophy } from '@design/sprites/Trophy';
import { type GameResult } from '@storage/index';

import { DIFFICULTY_LABELS } from '../difficulty';
import { findEntry } from '../registry';
import { useStorage } from '../storageContext';

import s from './History.module.css';

/**
 * Every game played, newest first.
 *
 * It reads the raw results log rather than the aggregate: the totals on Home
 * answer "how am I doing", this answers "what did I actually play". Game names
 * come from the registry, so a game that is no longer registered still shows
 * its rows instead of vanishing from someone's history.
 */
export function History() {
  const storage = useStorage();
  const [results, setResults] = useState<GameResult[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    storage
      .listResults()
      .then((list) => {
        if (!cancelled) setResults(list);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      });

    return () => {
      cancelled = true;
    };
  }, [storage]);

  return (
    <div className={`${s.page} anim-view-in`} id="main">
      <header className={s.header}>
        <Link to="/" className={s.back} aria-label="Volver al inicio">
          <ArrowLeftIcon />
        </Link>
        <h1 className={s.title}>Mi historial</h1>
      </header>

      {results === null && (
        <div className={s.loading}>
          <Skeleton h="var(--sp-7)" label="Cargando el historial" />
          <Skeleton h="var(--sp-7)" />
          <Skeleton h="var(--sp-7)" />
        </div>
      )}

      {results?.length === 0 && (
        <EmptyState
          sprite={<Trophy size={40} />}
          title="Todavía no jugaste nada"
          description="Cuando termines una partida vas a verla acá, con su dificultad y su tiempo."
          action={
            <Link to="/" className={s.cta}>
              Elegir un juego
            </Link>
          }
        />
      )}

      {results !== null && results.length > 0 && (
        <ul className={s.list}>
          {results.map((result) => (
            <li key={`${result.gameId}-${String(result.finishedAt)}`} className={s.row}>
              <span className={s.game}>
                {findEntry(result.gameId)?.preview.name ?? result.gameId}
              </span>

              <span className={s.tags}>
                <Badge tone={result.outcome === 'won' ? 'success' : 'danger'}>
                  {result.outcome === 'won' ? 'Completado' : 'Sin terminar'}
                </Badge>
                <Badge tone="accent">
                  {DIFFICULTY_LABELS[result.difficulty as 1 | 2 | 3 | 4 | 5] ?? '—'}
                </Badge>
              </span>

              <span className={`${s.time} tabular`}>{formatDuration(result.elapsedMs)}</span>
              <span className={s.when}>{formatWhen(result.finishedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (n: number) => n.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** "hace 5 min" beats a timestamp for anything from the last day. */
function formatWhen(at: number): string {
  const minutes = Math.floor((Date.now() - at) / 60_000);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${String(minutes)} min`;
  if (minutes < 24 * 60) return `hace ${String(Math.floor(minutes / 60))} h`;

  return new Date(at).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
