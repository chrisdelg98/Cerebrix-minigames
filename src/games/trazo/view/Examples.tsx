import s from './Examples.module.css';

/** `.` vacía · `>` `v` `<` `^` tramo · un dígito, número del recorrido. */
function Board({ rows, verdict }: { rows: string[]; verdict?: 'ok' | 'no' }) {
  return (
    <div className={s.strip}>
      <span className={s.board} style={{ '--n': rows[0]?.length ?? 3 } as React.CSSProperties}>
        {rows.flatMap((row, r) =>
          [...row].map((char, c) => (
            <span key={`${String(r)}-${String(c)}`} className={s.cell} data-fill={char}>
              {/\d/.test(char) && <span className={s.number}>{char}</span>}
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

export function OrderExample() {
  return (
    <div className={s.figure}>
      <Board rows={['1xx', '..x', '..2']} verdict="ok" />
      <Board rows={['1..', '...', '..2']} verdict="no" />
    </div>
  );
}

export function CoverExample() {
  return (
    <div className={s.figure}>
      <Board rows={['1xx', 'xxx', 'xx2']} verdict="ok" />
      <Board rows={['1xx', '..x', 'xx2']} verdict="no" />
    </div>
  );
}
