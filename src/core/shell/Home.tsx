import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { EmptyState } from '@design/components/EmptyState';
import { SettingsToggles } from '@design/components/SettingsToggles';
import { LogoCerebrix } from '@design/sprites/LogoCerebrix';
import { type CSSVars } from '@design/types';

import { usePrefetch } from '../hooks/usePrefetch';
import { REGISTRY, type RegistryEntry } from '../registry';

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

  return (
    <div className={s.home} id="main" data-intro={intro}>
      <header className={s.masthead}>
        <LogoCerebrix size={36} />
        <div>
          <h1 className={s.title}>Cerebrix</h1>
          <p className={s.tagline}>Minijuegos para la concentración.</p>
        </div>
        <SettingsToggles />
      </header>

      {entries.length === 0 ? (
        <EmptyState
          title="Todavía no hay juegos"
          description="El registro está vacío. Agregá una entrada en src/core/registry.ts."
        />
      ) : (
        <ul className={s.grid}>
          {entries.map((entry, i) => {
            const Icon = entry.icon;

            return (
              <li
                key={entry.id}
                className={`${s.card} anim-stagger`}
                style={{ '--i': i } as CSSVars}
              >
                <Link
                  to={`/game/${entry.id}`}
                  className={s.cardLink}
                  // The chunk is usually there by the time the finger lifts.
                  onPointerEnter={() => {
                    prefetch(entry.load);
                  }}
                  onPointerDown={() => {
                    prefetch(entry.load);
                  }}
                >
                  <span className={s.cardIcon}>
                    <Icon size={28} />
                  </span>

                  <span className={s.cardBody}>
                    <span className={s.cardName}>{entry.preview.name}</span>
                    <span className={s.cardTagline}>{entry.preview.tagline}</span>

                    <span className={s.cardMeta}>
                      {entry.preview.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                      <Badge tone="accent">
                        {entry.preview.estimatedMinutes[0]}–{entry.preview.estimatedMinutes[1]} min
                      </Badge>
                      <Badge>{entry.preview.difficulties.length} niveles</Badge>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
