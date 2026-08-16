import s from './Examples.module.css';

/**
 * The two things a first-timer has to be shown rather than told: what a clue
 * means, and why you can be certain about a square before you know the row.
 *
 * Drawn with divs instead of an SVG so the squares pick up the same tokens the
 * real board does — the example in the rules and the thing on screen have to be
 * recognisably the same object.
 */

/**
 * `#` painted · `.` empty · `x` discarded · `A` painted and worth pointing at.
 */
function Strip({ clue, cells, verdict }: { clue: string; cells: string; verdict?: 'ok' | 'no' }) {
  return (
    <div className={s.strip}>
      <span className={s.clue}>{clue}</span>
      <span className={s.cells}>
        {[...cells].map((char, i) => (
          <span key={i} className={s.cell} data-fill={char} />
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

export function ReadingExample() {
  return (
    <div className={s.figure}>
      <Strip clue="3 1" cells="###.#" verdict="ok" />
      <Strip clue="3 1" cells="##.##" verdict="no" />
    </div>
  );
}

export function OverlapExample() {
  return (
    <div className={s.figure}>
      <Strip clue="4" cells="#AAA." />
      <Strip clue="4" cells=".AAA#" />
    </div>
  );
}
