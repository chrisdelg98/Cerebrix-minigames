import { Link } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { LogoCerebrix } from '@design/sprites/LogoCerebrix';
import { type CSSVars } from '@design/types';

import { usePrefetch } from '../hooks/usePrefetch';
import { REGISTRY, type RegistryEntry } from '../registry';

import s from './Home.module.css';

export interface HomeProps {
  /** Defaults to the real manifest; injected in tests to prove nothing is hardcoded. */
  entries?: readonly RegistryEntry[];
}

/**
 * The card grid is read from the registry and from nowhere else. Adding a game
 * means adding a registry entry — this file never changes.
 */
export function Home({ entries = REGISTRY }: HomeProps) {
  const prefetch = usePrefetch();

  return (
    <div className={s.home} id="main">
      <header className={s.masthead}>
        <LogoCerebrix size={36} />
        <div>
          <h1 className={s.title}>Cerebrix</h1>
          <p className={s.tagline}>Minijuegos para la concentración.</p>
        </div>
      </header>

      <ul className={s.grid}>
        {entries.map((entry, i) => {
          const Icon = entry.icon;

          return (
            <li key={entry.id} className={`${s.card} anim-stagger`} style={{ '--i': i } as CSSVars}>
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
    </div>
  );
}
