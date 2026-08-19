import { useState } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@design/components/EmptyState';
import { FilterChips } from '@design/components/FilterChips';
import { InstallButton } from '@design/components/InstallButton';
import { SettingsToggles } from '@design/components/SettingsToggles';
import { StatTile } from '@design/components/StatTile';
import { Clock } from '@design/sprites/Clock';
import { GamepadIcon, InstallIcon, TargetIcon } from '@design/sprites/SettingsIcons';
import { LogoCerebrix } from '@design/sprites/LogoCerebrix';
import { Streak } from '@design/sprites/Streak';
import { Trophy } from '@design/sprites/Trophy';

import {
  ALL_CATEGORIES,
  asCategoryFilter,
  categoryOptions,
  matchesCategory,
  type CategoryFilter,
} from '../category';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
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
const CATEGORY_KEY = 'cerebrix:categoria';

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
 * El estante elegido sobrevive a entrar a un juego y volver.
 *
 * Home se vuelve a montar en cada vuelta, así que sin esto el filtro se
 * reinicia justo cuando alguien está recorriendo un estante — que es cuando más
 * lo está usando. Es la misma sessionStorage que `claimIntro`, y por el mismo
 * motivo: dura lo que dura la visita, no queda pegado para siempre.
 */
function readCategory(): CategoryFilter {
  try {
    return asCategoryFilter(sessionStorage.getItem(CATEGORY_KEY)) ?? ALL_CATEGORIES;
  } catch {
    return ALL_CATEGORIES;
  }
}

function rememberCategory(value: CategoryFilter): void {
  try {
    sessionStorage.setItem(CATEGORY_KEY, value);
  } catch {
    /* Sin sessionStorage el filtro sigue funcionando; solo no se recuerda. */
  }
}

/**
 * The card grid is read from the registry and from nowhere else. Adding a game
 * means adding a registry entry — this file never changes.
 */
export function Home({ entries = REGISTRY }: HomeProps) {
  // Lo oculto sigue teniendo ruta y registro; solo no se ofrece acá.
  const visible = entries.filter((entry) => entry.hidden !== true);

  useDocumentMeta(
    'Cerebrix',
    'Minijuegos de lógica para entrenar la concentración: Sudoku, Buscaminas, Nonograma, Tango, Queens, Memoria y más. Gratis, sin cuenta, y funcionan sin conexión.'
  );
  const prefetch = usePrefetch();
  const [intro] = useState(claimIntro);
  const [category, setCategory] = useState(readCategory);
  const { sessions, refresh: refreshSessions } = useSavedSessions();
  const { stats, refresh: refreshStats } = useGlobalStats();

  /*
   * Las pastillas salen de los juegos que hay, no de una lista escrita acá: un
   * estante nuevo aparece solo con registrar un juego que lo declare, y uno que
   * se queda sin juegos deja de ofrecerse.
   */
  const options = categoryOptions(visible.map((entry) => entry.preview.category));
  const shown = visible.filter((entry) => matchesCategory(category, entry.preview.category));

  const chooseCategory = (value: CategoryFilter) => {
    setCategory(value);
    rememberCategory(value);
  };

  const refreshAll = () => {
    refreshSessions();
    refreshStats();
  };

  return (
    <div className={`${s.home} ${intro ? '' : 'anim-view-in'}`} id="main" data-intro={intro}>
      {/*
        Two rows on purpose. Squeezing the brand and the controls onto one line
        is what left the header clipped on a phone; below 640px they stack and
        the controls get their own row rather than fighting for the last 40px.
      */}
      <header className={`${s.masthead} ${intro ? 'anim-slide-up' : ''}`}>
        <div className={s.brand}>
          <LogoCerebrix size={56} />
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
          <StatTile label="Partidas" value={stats.played} icon={<GamepadIcon size={64} />} />
          <StatTile
            label="Completadas"
            value={stats.completed}
            icon={<Trophy size={64} state="unlocked" />}
          />
          <StatTile
            label="Éxito"
            value={Math.round(stats.successRate * 100)}
            format={(value) => `${String(Math.round(value))}%`}
            icon={<TargetIcon size={64} />}
          />
          <StatTile label="Racha" value={stats.currentStreak} icon={<Streak size={64} />} />
        </section>
      )}

      {/* Con un solo estante el filtro no filtra nada: es ruido con aspecto de control. */}
      {options.length > 2 && (
        <div className={`${s.filters} ${intro ? 'anim-slide-up' : ''}`}>
          <FilterChips
            value={category}
            options={options}
            onChange={chooseCategory}
            label="Categoría"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Todavía no hay juegos"
          description="El registro está vacío. Agregá una entrada en src/core/registry.ts."
        />
      ) : (
        <ul className={s.grid}>
          {shown.map((entry, i) => (
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
        {/* Renders nothing unless the browser says the app can be installed. */}
        <InstallButton icon={<InstallIcon />} />
        <DataControls onImported={refreshAll} />
      </footer>
    </div>
  );
}
