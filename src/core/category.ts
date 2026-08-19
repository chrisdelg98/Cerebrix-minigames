import { type ComponentType } from 'react';

import { AllGamesIcon, ArcadeIcon, LogicIcon } from '@design/sprites/CategoryIcons';

import { type GameCategory } from './contract';

/**
 * Los estantes de la portada. Cada juego declara el suyo en su metadata; acá
 * solo viven el orden en que se ofrecen y cómo se escriben.
 *
 * Mismo reparto que /core/difficulty.ts: el filtro es del shell, la categoría
 * de cada juego es del juego. /design no puede importar /core, así que los
 * estantes viajan al control como opciones planas y `<FilterChips>` nunca
 * aprende qué es una categoría.
 */

export const CATEGORIES: readonly GameCategory[] = ['lógica', 'arcade'];

export const CATEGORY_LABELS: Readonly<Record<GameCategory, string>> = {
  lógica: 'Lógica',
  arcade: 'Arcade',
};

/** Declarados en design/sprites/CategoryIcons.tsx, uno por estante. */
export const CATEGORY_ICONS: Readonly<Record<GameCategory, ComponentType<{ size?: number }>>> = {
  lógica: LogicIcon,
  arcade: ArcadeIcon,
};

/** El valor de "no filtrar". No es una categoría: ningún juego puede declararlo. */
export const ALL_CATEGORIES = 'todas';

export type CategoryFilter = GameCategory | typeof ALL_CATEGORIES;

export interface CategoryOption {
  value: CategoryFilter;
  label: string;
  /** Cuántos juegos quedan al elegirlo. */
  count: number;
  icon: ComponentType<{ size?: number }>;
}

/**
 * Las pastillas que se dibujan, derivadas de los juegos que hay.
 *
 * Un estante vacío no se ofrece: un filtro que lleva a una grilla en blanco es
 * un botón roto. Por eso recibe las categorías presentes en vez de mapear
 * CATEGORIES a ciegas — CATEGORIES solo aporta el orden.
 */
export function categoryOptions(present: readonly GameCategory[]): CategoryOption[] {
  const options: CategoryOption[] = [
    { value: ALL_CATEGORIES, label: 'Todos', count: present.length, icon: AllGamesIcon },
  ];

  for (const category of CATEGORIES) {
    const count = present.filter((each) => each === category).length;
    if (count > 0) {
      options.push({
        value: category,
        label: CATEGORY_LABELS[category],
        count,
        icon: CATEGORY_ICONS[category],
      });
    }
  }

  return options;
}

export function matchesCategory(filter: CategoryFilter, category: GameCategory): boolean {
  return filter === ALL_CATEGORIES || filter === category;
}

/**
 * Narrows a value read back from storage or from the URL.
 *
 * Igual que `asDifficulty`: lo que vuelve de afuera es un string cualquiera, y
 * una categoría que ya no existe no puede volver a entrar al filtro.
 */
export function asCategoryFilter(value: string | null): CategoryFilter | null {
  if (value === ALL_CATEGORIES) return ALL_CATEGORIES;
  return CATEGORIES.find((category) => category === value) ?? null;
}
