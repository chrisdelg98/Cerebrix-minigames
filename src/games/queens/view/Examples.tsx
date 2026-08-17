import { CrownGlyph } from '../sprites/QueensIcons';

import s from './Examples.module.css';

/** `q` corona · `.` vacía · `1`-`3` tinte de región. */
function Board({ rows, verdict }: { rows: string[]; verdict?: 'ok' | 'no' }) {
  return (
    <div className={s.strip}>
      <span className={s.board} style={{ '--n': rows.length } as React.CSSProperties}>
        {rows.flatMap((row, r) =>
          [...row].map((char, c) => (
            <span key={`${String(r)}-${String(c)}`} className={s.cell} data-region={char}>
              {char === 'q' && <CrownGlyph />}
            </span>
          ))
        )}
      </span>
      {verdict !== undefined && (
        <span className={s.verdict} data-verdict={verdict}>
          {verdict === 'ok' ? '✓' : '✕'}
        </span>
      )}
    </div>
  );
}

export function LineExample() {
  return (
    <div className={s.figure}>
      <Board rows={['.q.', '...', 'q..']} verdict="ok" />
      <Board rows={['.q.', '...', '.q.']} verdict="no" />
    </div>
  );
}

export function TouchExample() {
  return (
    <div className={s.figure}>
      <Board rows={['q..', '...', '..q']} verdict="ok" />
      <Board rows={['q..', '.q.', '...']} verdict="no" />
    </div>
  );
}
