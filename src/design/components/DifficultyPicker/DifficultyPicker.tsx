import { useState } from 'react';

import { ChevronDownIcon } from '../../sprites/SettingsIcons';
import { type CSSVars } from '../../types';
import { Modal } from '../Modal';

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
 *
 * Two controls, one per width, and only ever one in the document:
 *
 *   ≥ --bp-sm  a segmented row: the whole scale visible at once, each level in
 *              its colour.
 *   < --bp-sm  a button that opens a sheet. Five readable chips do not fit
 *              360px and the row was being cut off, which reads as broken.
 *
 * The sheet is ours rather than a native <select>. The native control fits the
 * width fine, but the list it opens is drawn by the platform: cramped, beyond
 * the reach of the design system, and nothing like the rest of the app. Here
 * the options get room, their colour, and a real touch target.
 *
 * The hidden control is `display: none`, so it is out of the accessibility tree
 * too: a screen reader finds one difficulty control, not two.
 */
export function DifficultyPicker<T extends number>({
  value,
  options,
  onChange,
  label = 'Dificultad',
}: DifficultyPickerProps<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.value === value);

  const levelStyle = (color: string | undefined) =>
    color === undefined ? undefined : ({ '--level-color': color } as CSSVars);

  return (
    <>
      <div className={s.picker} role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={s.option}
            data-selected={option.value === value}
            style={levelStyle(option.color)}
            onClick={() => {
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className={s.compact}
        style={levelStyle(current?.color)}
        aria-label={`${label}: ${current?.label ?? ''}. Tocá para cambiarla.`}
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className={s.compactLabel}>{label}</span>
        <span className={s.compactValue}>{current?.label}</span>
        <ChevronDownIcon />
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        title="Elegí la dificultad"
      >
        <ul className={s.sheet}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={s.sheetOption}
                data-selected={option.value === value}
                style={levelStyle(option.color)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className={s.dot} aria-hidden="true" />
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
