import { type ReactNode } from 'react';

import { ProgressBar } from '@design/components/ProgressBar';

import s from './AppShell.module.css';

export interface AppShellProps {
  header: ReactNode;
  /**
   * The secondary controls of the bar — the difficulty picker, today.
   *
   * They share the header line when there is room and drop to their own row
   * below --bp-sm, where five levels plus a title plus a clock stopped fitting
   * and the title was being truncated to "Sud...".
   */
  subheader?: ReactNode;
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
export function AppShell({ header, subheader, children, footer, progress }: AppShellProps) {
  return (
    <div className={s.shell}>
      <header className={s.header}>
        <div className={s.headerRow}>{header}</div>
        {subheader !== undefined && <div className={s.subRow}>{subheader}</div>}
        {progress !== undefined && (
          <div className={s.progress}>
            <ProgressBar value={progress} label="Progreso de la partida" />
          </div>
        )}
      </header>

      <main className={s.board} id="main">
        {children}
      </main>

      {footer !== undefined && <footer className={s.footer}>{footer}</footer>}
    </div>
  );
}
