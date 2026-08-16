import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { Button } from '@design/components/Button';
import { EmptyState } from '@design/components/EmptyState';
import { Modal } from '@design/components/Modal';
import { Skeleton } from '@design/components/Skeleton';
import { ArrowLeftIcon } from '@design/sprites/SettingsIcons';
import { Trophy } from '@design/sprites/Trophy';
import { computeStats, type GameResult } from '@storage/index';

import { type Difficulty } from '../contract';
import { DIFFICULTY_LABELS, DIFFICULTIES } from '../difficulty';
import { findEntry, REGISTRY } from '../registry';
import { useStorage } from '../storageContext';

import s from './History.module.css';

/** How many rows before asking. Long histories are the normal case, not the edge. */
const PAGE = 20;

const ALL = '__all__';

export function History() {
  const storage = useStorage();
  const [results, setResults] = useState<GameResult[] | null>(null);
  const [game, setGame] = useState<string>(ALL);
  const [shown, setShown] = useState(PAGE);
  const [confirmWipe, setConfirmWipe] = useState(false);

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

  /** Only games that actually appear in the log get a tab. */
  const played = useMemo(() => {
    const ids = new Set((results ?? []).map((r) => r.gameId));
    return REGISTRY.filter((entry) => ids.has(entry.id));
  }, [results]);

  const filtered = useMemo(
    () => (game === ALL ? (results ?? []) : (results ?? []).filter((r) => r.gameId === game)),
    [results, game]
  );

  const wipe = () => {
    void storage.clearAll().then(() => {
      setResults([]);
      setConfirmWipe(false);
      setGame(ALL);
    });
  };

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
        <>
          <Progress results={results} />

          {/* One tab per game that has been played, plus everything. */}
          {played.length > 1 && (
            <div className={s.filters} role="tablist" aria-label="Filtrar por juego">
              <FilterTab
                label="Todos"
                active={game === ALL}
                onSelect={() => {
                  setGame(ALL);
                  setShown(PAGE);
                }}
              />
              {played.map((entry) => (
                <FilterTab
                  key={entry.id}
                  label={entry.preview.name}
                  active={game === entry.id}
                  onSelect={() => {
                    setGame(entry.id);
                    setShown(PAGE);
                  }}
                />
              ))}
            </div>
          )}

          <ul className={s.list}>
            {filtered.slice(0, shown).map((result) => (
              <li key={`${result.gameId}-${String(result.finishedAt)}`} className={s.row}>
                <span className={s.game}>
                  {findEntry(result.gameId)?.preview.name ?? result.gameId}
                </span>

                <span className={s.tags}>
                  <Badge tone={result.outcome === 'won' ? 'success' : 'danger'}>
                    {result.outcome === 'won' ? 'Completado' : 'Sin terminar'}
                  </Badge>
                  <Badge tone="accent">
                    {DIFFICULTY_LABELS[result.difficulty as Difficulty] ?? '—'}
                  </Badge>
                </span>

                <span className={`${s.time} tabular`}>{formatDuration(result.elapsedMs)}</span>
                <span className={s.when}>{formatWhen(result.finishedAt)}</span>
              </li>
            ))}
          </ul>

          {filtered.length > shown && (
            <div className={s.more}>
              <Button
                onClick={() => {
                  setShown((n) => n + PAGE);
                }}
              >
                Ver más ({filtered.length - shown} restantes)
              </Button>
            </div>
          )}

          <footer className={s.danger}>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmWipe(true);
              }}
            >
              Borrar todos mis datos
            </Button>
          </footer>
        </>
      )}

      <Modal
        open={confirmWipe}
        onClose={() => {
          setConfirmWipe(false);
        }}
        title="¿Borrar todo?"
        actions={
          <>
            <Button
              onClick={() => {
                setConfirmWipe(false);
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={wipe}>
              Sí, borrar todo
            </Button>
          </>
        }
      >
        <p className={s.warning}>
          Se borra <strong>todo tu progreso</strong>: el historial de partidas, los récords, las
          rachas y las partidas que dejaste a medias.
        </p>
        <p className={s.warning}>Empezás de cero, y esto no se puede deshacer.</p>
      </Modal>
    </div>
  );
}

function FilterTab({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} className={s.tab} onClick={onSelect}>
      {label}
    </button>
  );
}

/**
 * Records, not counters.
 *
 * "37 of 50 puzzles" would be a ceiling the player did not ask for, and it stops
 * meaning anything the moment boards are generated. Best time per level answers
 * the question that actually matters — am I getting better — and never runs out.
 */
function Progress({ results }: { results: readonly GameResult[] }) {
  const perGame = useMemo(() => {
    const ids = [...new Set(results.map((r) => r.gameId))];
    return ids.map((id) => ({ id, stats: computeStats(id, results) }));
  }, [results]);

  return (
    <section className={s.progress} aria-label="Tu progreso">
      <h2 className={s.sectionTitle}>Tu progreso</h2>

      {perGame.map(({ id, stats }) => (
        <article key={id} className={s.progressCard}>
          <header className={s.progressHead}>
            <span className={s.game}>{findEntry(id)?.preview.name ?? id}</span>
            <span className={s.progressTotals}>
              {stats.completed} de {stats.played} · {Math.round(stats.successRate * 100)}% · racha{' '}
              {stats.currentStreak}
            </span>
          </header>

          <ul className={s.levels}>
            {DIFFICULTIES.map((level) => {
              const best = stats.bestMsByDifficulty[level];
              return (
                <li key={level} className={s.level} data-done={best !== undefined}>
                  <span className={s.levelName}>{DIFFICULTY_LABELS[level]}</span>
                  <span className={`${s.levelBest} tabular`}>
                    {best === undefined ? '—' : formatDuration(best)}
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </section>
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
