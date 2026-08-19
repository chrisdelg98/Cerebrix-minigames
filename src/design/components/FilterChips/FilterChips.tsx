import { type ComponentType } from 'react';

import s from './FilterChips.module.css';

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
  /** Cuántos elementos quedan al elegirlo. Se dibuja solo si viene. */
  count?: number;
  /**
   * Un glifo al lado de la palabra. Componente, no ruta — igual que en el resto
   * del sistema. Llega desde afuera porque qué dibuja cada opción lo sabe quien
   * arma el filtro, no el filtro.
   */
  icon?: ComponentType<{ size?: number }>;
}

export interface FilterChipsProps<T extends string> {
  value: T;
  /** Solo las opciones que llevan a algo. El control no inventa ninguna. */
  options: readonly FilterChipOption<T>[];
  onChange: (value: T) => void;
  /** Qué se está filtrando, para el lector de pantalla. */
  label: string;
}

/**
 * Una fila de pastillas para partir una lista en estantes.
 *
 * `radiogroup` y no `tablist`: no hay paneles, hay una sola lista que se acorta.
 * Es el mismo rol que usa `<DifficultyPicker>`, y por la misma razón — elegir
 * uno entre varios, con el elegido siempre visible.
 *
 * El conteo viaja en la opción en vez de calcularse acá: /design no ve la lista
 * que se está filtrando, y no debería. Ver docs/STYLING.md §1.
 */
export function FilterChips<T extends string>({
  value,
  options,
  onChange,
  label,
}: FilterChipsProps<T>) {
  return (
    <div className={s.chips} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={s.chip}
          data-selected={option.value === value}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.icon !== undefined && (
            <span className={s.icon} aria-hidden="true">
              <option.icon size={16} />
            </span>
          )}
          {option.label}
          {option.count !== undefined && (
            /* aria-hidden: el conteo es una ayuda visual, y leído en voz alta
               quedaría "Arcade 2" sin decir qué es ese 2. */
            <span className={s.count} aria-hidden="true">
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
