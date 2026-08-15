import s from './Notes.module.css';

/**
 * Pencil marks, laid out in the 3×3 positions they occupy on a keypad, so 7 is
 * always bottom-left whether or not the others are there. A list that reflowed
 * would make the same cell look different every time a note is added.
 */
export function Notes({ values }: { values: readonly number[] }) {
  if (values.length === 0) return null;

  const present = new Set(values);

  return (
    <span className={s.notes} aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={s.note}>
          {present.has(i + 1) ? i + 1 : ''}
        </span>
      ))}
    </span>
  );
}
