import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { Button } from '@design/components/Button';
import { EmptyState } from '@design/components/EmptyState';
import { FilterChips } from '@design/components/FilterChips';
import { Modal } from '@design/components/Modal';
import { Skeleton } from '@design/components/Skeleton';
import { ArrowLeftIcon } from '@design/sprites/SettingsIcons';
import { Trophy } from '@design/sprites/Trophy';
import { type BadgeRecord } from '@storage/types';
import { computeGlobalStats, computeStats, type GameResult } from '@storage/index';

import { BADGES, TIER_LABELS, type BadgeTier } from '../badges';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

import { type Difficulty } from '../contract';
import { DIFFICULTY_LABELS, DIFFICULTIES } from '../difficulty';
import { findEntry, REGISTRY } from '../registry';
import { GlobalStatsPanel } from './GlobalStatsPanel';
import { useStorage } from '../storageContext';

import s from './History.module.css';

/** How many rows before asking. Long histories are the normal case, not the edge. */
/*
 * Diez por tanda.
 *
 * Con veinte, alguien que jugó un rato abría el historial y se encontraba una
 * pared de filas antes de ver nada más. Diez entra en una pantalla y deja el
 * resto a un toque de distancia.
 */
const PAGE = 10;

const ALL = '__all__';

export function History() {
  useDocumentMeta('Mi historial', 'Tus partidas, tus mejores tiempos y tu racha en Cerebrix.');

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
          {/*
            Las cuatro cifras globales, arriba de todo.
            En un teléfono la portada muestra solo la racha para no comerse la
            primera pantalla, así que este es el lugar donde están completas.
            Se calculan de los resultados que esta pantalla ya cargó, sin pedirle
            nada más al storage.
          */}
          <section className={s.totals} aria-label="Tus estadísticas">
            <GlobalStatsPanel stats={computeGlobalStats(results)} />
          </section>

          <Badges />

          <Progress results={results} />

          {/*
            El MISMO control que filtra la portada, no uno propio.
            Hacen exactamente el mismo trabajo —acortar una lista— y tenerlo dos
            veces significaba dos aspectos distintos para la misma acción: acá
            eran pastillas planas y allá, botones con relieve.

            Y `radiogroup` en vez de `tablist`, que es lo que era: no hay paneles
            que cambiar, hay una sola lista que se acorta.
          */}
          {played.length > 1 && (
            <div className={s.filters}>
              <FilterChips
                value={game}
                options={[
                  { value: ALL, label: 'Todos', count: results.length },
                  ...played.map((entry) => ({
                    value: entry.id,
                    label: entry.preview.name,
                    count: results.filter((result) => result.gameId === entry.id).length,
                  })),
                ]}
                onChange={(next) => {
                  setGame(next);
                  setShown(PAGE);
                }}
                label="Filtrar por juego"
              />
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
                    {/* «Sin terminar» decía otra cosa: que la dejaste a medias.
                        Un registro solo se escribe cuando el motor declaró un
                        final, así que esto es una derrota, no un abandono —
                        una partida abandonada no llega nunca hasta acá. */}
                    {result.outcome === 'won' ? 'Completado' : 'Perdida'}
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

/**
 * Los logros, ganados y por ganar.
 *
 * Los que faltan se muestran en gris con su condición, no escondidos: un logro
 * invisible no motiva a nadie a ir por él.
 *
 * Hoy hay uno solo —completar una campaña— y es de los que hay que grabar
 * porque el historial no lo dice. Cuando lleguen los deducibles ("100 partidas
 * jugadas", "50 ganadas en Fácil") van a salir de las estadísticas y a mostrarse
 * acá mismo, sin que el jugador note que se calculan distinto. Ver `badges.ts`.
 */
function Badges() {
  const storage = useStorage();
  const [earned, setEarned] = useState<BadgeRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void storage.listBadges().then((all) => {
      if (!cancelled) setEarned(all);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  return (
    <section className={s.badges} aria-label="Tus logros">
      <h2 className={s.sectionTitle}>Logros</h2>
      <ul className={s.badgeList}>
        {BADGES.map((badge) => {
          const won = earned.find((one) => one.id === badge.id);
          const tier = tierOf(won);

          return (
            <li key={badge.id} className={s.badge} data-won={won !== undefined}>
              <span className={s.badgeName}>
                {badge.name}
                {tier !== null && (
                  <Badge tone={tier === 'gold' ? 'gold' : 'accent'}>{TIER_LABELS[tier]}</Badge>
                )}
              </span>
              <span className={s.badgeHint}>
                {won === undefined ? badge.requirement : `Ganado ${formatWhen(won.earnedAt)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** El nivel viaja en el detalle serializado; un detalle ilegible no rompe nada. */
function tierOf(record: BadgeRecord | undefined): BadgeTier | null {
  if (record?.detail === undefined) return null;
  try {
    const parsed = JSON.parse(record.detail) as { tier?: string };
    const tier = parsed.tier;
    return tier === 'gold' || tier === 'silver' || tier === 'bronze' ? tier : null;
  } catch {
    return null;
  }
}
