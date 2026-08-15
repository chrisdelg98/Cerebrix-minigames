import { type ReactNode } from 'react';

import s from './Badge.module.css';

export interface BadgeProps {
  tone?: 'neutral' | 'accent' | 'gold' | 'success' | 'danger';
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span className={s.badge} data-tone={tone}>
      {children}
    </span>
  );
}
