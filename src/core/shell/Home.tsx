import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@design/components/EmptyState';
import { SettingsToggles } from '@design/components/SettingsToggles';
import { StatTile } from '@design/components/StatTile';
import { Clock } from '@design/sprites/Clock';
import { LogoCerebrix } from '@design/sprites/LogoCerebrix';
import { Streak } from '@design/sprites/Streak';
import { Trophy } from '@design/sprites/Trophy';

import { usePrefetch } from '../hooks/usePrefetch';
import { useGlobalStats, useSavedSessions } from '../hooks/useStoredData';
import { REGISTRY, type RegistryEntry } from '../registry';
import { DataControls } from './DataControls';
import { GameCard } from './GameCard';

import s from './Home.module.css';

export interface HomeProps {
  /** Defaults to the real manifest; injected in tests to prove nothing is hardcoded. */
  entries?: readonly RegistryEntry[];
}

const INTRO_KEY = 'cerebrix:intro';

/**
 * The full entrance sequence runs ONCE per session (docs/DESIGN_SYSTEM.md §5.4).
 * Coming back to Home from a game gets the shorter `view-in` instead — an
 * animation you have already seen is just latency.
 */
function claimIntro(): boolean {
  try {
    if (sessionStorage.getItem(INTRO_KEY) !== null) return false;
    sessionStorage.setItem(INTRO_KEY, '1');
    return true;
  } catch {
    return true;
  }
}

/**
 * The card grid is read from the registry and from nowhere else. Adding a game
 * means adding a registry entry — this file never changes.
 */
export function Home({ entries = REGISTRY }: HomeProps) {
  const prefetch = usePrefetch();
  const [intro] = useState(claimIntro);
  const { sessions, refresh: refreshSessions } = useSavedSessions();
  const { stats, refresh: refreshStats } = useGlobalStats();

  const refreshAll = () => {
    refreshSessions();
    refreshStats();
  };

  return (
    <div className={s.home} id="main" data-intro={intro}>
      {/*
        Two rows on purpose. Squeezing the brand and the controls onto one line
        is what left the header clipped on a phone; below 640px they stack and
        the controls get their own row rather than fighting for the last 40px.
      */}
      <header className={s.masthead}>
        <div className={s.brand}>
          <LogoCerebrix size={40} />
          <div>
            <h1 className={s.title}>Cerebrix</h1>
            <p className={s.tagline}>Minijuegos para la concentración.</p>
          </div>
        </div>

        <div className={s.controls}>
          <Link to="/historial" className={s.historyLink}>
            <Clock size={18} />
            Mi historial
          </Link>
          <SettingsToggles />
        </div>
      </header>

      {stats !== null && stats.played > 0 && (
        <section className={s.stats} aria-label="Tus estadísticas">
          <StatTile label="Partidas" value={stats.played} icon={<Trophy size={18} />} />
          <StatTile
            label="Completadas"
            value={stats.completed}
            icon={<Trophy size={18} state="unlocked" />}
          />
          <StatTile
            label="Éxito"
            value={Math.round(stats.successRate * 100)}
            format={(value) => `${String(Math.round(value))}%`}
            icon={<Clock size={18} />}
          />
          <StatTile
            label="Racha"
            value={stats.currentStreak}
            icon={<Streak size={18} count={stats.currentStreak} />}
          />
        </section>
      )}

      {entries.length === 0 ? (
        <EmptyState
          title="Todavía no hay juegos"
          description="El registro está vacío. Agregá una entrada en src/core/registry.ts."
        />
      ) : (
        <ul className={s.grid}>
          {entries.map((entry, i) => (
            <GameCard
              key={entry.id}
              entry={entry}
              index={i}
              continueAt={sessions[entry.id]?.difficulty}
              onPrefetch={() => {
                prefetch(entry.load);
              }}
            />
          ))}
        </ul>
      )}

      <footer className={s.footer}>
        <DataControls onImported={refreshAll} />
      </footer>
    </div>
  );
}
