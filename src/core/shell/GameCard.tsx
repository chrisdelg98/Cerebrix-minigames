import { Link } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { type CSSVars } from '@design/types';

import { DIFFICULTY_LABELS } from '../difficulty';
import { type RegistryEntry } from '../registry';

import s from './GameCard.module.css';

export interface GameCardProps {
  entry: RegistryEntry;
  /** Position in the grid, for the entrance cascade. */
  index: number;
  /** The level of a board waiting to be continued, if there is one. */
  continueAt?: number | undefined;
  onPrefetch: () => void;
}

/**
 * A game, presented. The sprite leads and the text follows, because a shelf of
 * games is scanned by picture first — a row of equal-sized text blocks is a
 * list of links, which is what this used to look like.
 */
export function GameCard({ entry, index, continueAt, onPrefetch }: GameCardProps) {
  const Icon = entry.icon;
  const [min, max] = entry.preview.estimatedMinutes;

  return (
    <li className={`${s.card} anim-stagger`} style={{ '--i': index } as CSSVars}>
      <Link
        to={`/game/${entry.id}`}
        className={s.link}
        // The chunk is usually there by the time the finger lifts.
        onPointerEnter={onPrefetch}
        onPointerDown={onPrefetch}
      >
        <span className={s.art}>
          <span className={s.icon}>
            <Icon size={72} />
          </span>
          {continueAt !== undefined && (
            <span className={s.resume}>
              <Badge tone="success">Continuar</Badge>
            </span>
          )}
        </span>

        <span className={s.body}>
          <span className={s.name}>{entry.preview.name}</span>
          <span className={s.tagline}>{entry.preview.tagline}</span>

          <span className={s.meta}>
            {continueAt !== undefined && (
              <Badge tone="accent">
                {DIFFICULTY_LABELS[continueAt as 1 | 2 | 3 | 4 | 5] ?? 'En curso'}
              </Badge>
            )}
            {entry.preview.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            <Badge>
              {min}–{max} min
            </Badge>
          </span>
        </span>
      </Link>
    </li>
  );
}
