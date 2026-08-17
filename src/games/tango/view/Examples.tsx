import { MoonGlyph, SunGlyph } from '../sprites/TangoIcons';

import s from './Examples.module.css';

/** `s` sun · `m` moon. */
function Strip({ cells, verdict, sign }: { cells: string; verdict?: 'ok' | 'no'; sign?: string }) {
  return (
    <div className={s.strip}>
      <span className={s.cells}>
        {[...cells].map((char, i) => (
          <span key={i} className={s.cell} data-value={char}>
            {char === 's' ? <SunGlyph size={16} /> : <MoonGlyph size={16} />}
            {sign !== undefined && i === 0 && <span className={s.sign}>{sign}</span>}
          </span>
        ))}
      </span>
      {verdict !== undefined && (
        <span className={s.verdict} data-verdict={verdict}>
          {verdict === 'ok' ? '✓' : '✕'}
        </span>
      )}
    </div>
  );
}

export function TripleExample() {
  return (
    <div className={s.figure}>
      <Strip cells="ssm" verdict="ok" />
      <Strip cells="sss" verdict="no" />
    </div>
  );
}

export function SignExample() {
  return (
    <div className={s.figure}>
      <Strip cells="ss" sign="=" />
      <Strip cells="sm" sign="×" />
    </div>
  );
}
