import { type CSSVars } from '../../types';

import s from './DifficultyPicker.module.css';

export interface DifficultyOption<T extends number> {
  value: T;
  label: string;
  /** A colour token reference, e.g. `var(--c-difficulty-3)`. Optional. */
  color?: string;
}

export interface DifficultyPickerProps<T extends number> {
  value: T;
  /** Only the levels the game declares. The picker invents nothing. */
  options: readonly DifficultyOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}

/**
 * Identical in every game — the difficulty scale is the shell's, its meaning is
 * the game's. /design cannot import /core, so the levels arrive as options and
 * this component never learns what a difficulty is.
 */
export function DifficultyPicker<T extends number>({
  value,
  options,
  onChange,
  label = 'Dificultad',
}: DifficultyPickerProps<T>) {
  return (
    <div className={s.picker} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={s.option}
          data-selected={option.value === value}
          style={
            option.color === undefined ? undefined : ({ '--level-color': option.color } as CSSVars)
          }
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
