import { type ReactNode } from 'react';

import { ProgressBar } from '@design/components/ProgressBar';

import s from './AppShell.module.css';

export interface AppShellProps {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** 0–1. Omit it and the bar is not rendered at all. */
  progress?: number;
}

/**
 * The frame every game plays inside: header, board area, action bar. It is
 * slot-based on purpose — the shell owns the layout, never the contents of a
 * particular game. Reference: docs/DESIGN_SYSTEM.md §7.2.
 */
export function AppShell({ header, children, footer, progress }: AppShellProps) {
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerRow}>{header}</div>
        {progress !== undefined && <ProgressBar value={progress} label="Progreso de la partida" />}
      </header>

      <main className={s.board} id="main">
        {children}
      </main>

      {footer !== undefined && <footer className={s.footer}>{footer}</footer>}
    </div>
  );
}
