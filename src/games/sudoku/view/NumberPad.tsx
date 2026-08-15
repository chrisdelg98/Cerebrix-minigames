import { IconButton } from '@design/components/IconButton';

import { EraserIcon, PencilIcon } from '../sprites/SudokuIcons';

import s from './NumberPad.module.css';

export interface NumberPadProps {
  pencil: boolean;
  disabled: boolean;
  /** How many of each digit are still missing, indexed 1–9. */
  remaining: readonly number[];
  onDigit: (value: number) => void;
  onErase: () => void;
  onTogglePencil: () => void;
}

/**
 * The touch keypad. On a phone this is the only way to enter a digit, so it
 * sits between the board and the action bar, inside thumb reach.
 *
 * Pencil mode lives here rather than in the shell's action bar: the contract's
 * GameAction can declare a toggle, but the view has no way to read its state
 * back, so a toggle there would light up without changing what a tap does.
 * See docs/GAME_CONTRACT.md — noted for the Phase 6 contract review.
 */
export function NumberPad({
  pencil,
  disabled,
  remaining,
  onDigit,
  onErase,
  onTogglePencil,
}: NumberPadProps) {
  return (
    <div className={s.pad} data-pencil={pencil}>
      <div className={s.digits}>
        {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => {
          const done = (remaining[digit] ?? 0) <= 0;
          return (
            <button
              key={digit}
              type="button"
              className={s.digit}
              // A finished digit stays visible but stops inviting a tap: hiding
              // it would make the pad reflow and move every other key.
              data-done={done}
              disabled={disabled}
              aria-label={`Escribir ${String(digit)}${done ? ', completo' : ''}`}
              onClick={() => {
                onDigit(digit);
              }}
            >
              {digit}
            </button>
          );
        })}
      </div>

      <div className={s.tools}>
        <IconButton
          label={pencil ? 'Salir del modo lápiz' : 'Modo lápiz'}
          icon={<PencilIcon />}
          variant={pencil ? 'solid' : 'ghost'}
          aria-pressed={pencil}
          disabled={disabled}
          onClick={onTogglePencil}
        />
        <IconButton
          label="Borrar la celda"
          icon={<EraserIcon />}
          disabled={disabled}
          onClick={onErase}
        />
      </div>
    </div>
  );
}
