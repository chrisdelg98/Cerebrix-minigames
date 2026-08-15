import { type ReactNode } from 'react';

import s from './EmptyState.module.css';

export interface EmptyStateProps {
  sprite?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ sprite, title, description, action }: EmptyStateProps) {
  return (
    <div className={s.empty}>
      {sprite !== undefined && <span className={s.sprite}>{sprite}</span>}
      <h3 className={s.title}>{title}</h3>
      {description !== undefined && <p className={s.description}>{description}</p>}
      {action}
    </div>
  );
}
