import { type ComponentType } from 'react';

import { type AnyGameModule, type GameMeta } from './contract';

// The ONLY file in /core allowed to name a game — and only by string, by lazy
// import(), and by an icon small enough to ride in the initial bundle. The lint
// exemption for this exact path lives in eslint.config.js.
import { DummyIcon } from '@games/_dummy/sprites/DummyIcon';
import { MinesweeperIcon } from '@games/minesweeper/sprites/MinesweeperIcons';
import { NonogramIcon } from '@games/nonogram/sprites/NonogramIcons';
import { SudokuIcon } from '@games/sudoku/sprites/SudokuIcons';

/**
 * The manifest. Adding a game is adding an entry here and nothing else in /core.
 * Reference: docs/GAME_CONTRACT.md §4.
 */
export interface RegistryEntry {
  id: string;
  /** Light metadata, so Home can paint a card without downloading the game. */
  preview: Pick<GameMeta, 'id' | 'name' | 'tagline' | 'difficulties' | 'tags' | 'estimatedMinutes'>;
  /** The icon IS a static import: ~1 kB, and Home needs it immediately. */
  icon: ComponentType<{ size?: number }>;
  /** The whole game, lazily. Never part of the initial bundle. */
  load: () => Promise<{ default: AnyGameModule }>;
}

export const REGISTRY: readonly RegistryEntry[] = [
  {
    id: 'sudoku',
    preview: {
      id: 'sudoku',
      name: 'Sudoku',
      tagline: 'El clásico 9×9, con anotaciones y pistas.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      estimatedMinutes: [5, 25],
    },
    icon: SudokuIcon,
    load: () => import('@games/sudoku'),
  },
  {
    id: 'minesweeper',
    preview: {
      id: 'minesweeper',
      name: 'Buscaminas',
      tagline: 'Despejá el campo sin pisar una mina.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      estimatedMinutes: [2, 15],
    },
    icon: MinesweeperIcon,
    load: () => import('@games/minesweeper'),
  },
  {
    id: 'nonogram',
    preview: {
      id: 'nonogram',
      name: 'Nonograma',
      tagline: 'Los números dicen qué pintar. Sale una figura.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      estimatedMinutes: [3, 20],
    },
    icon: NonogramIcon,
    load: () => import('@games/nonogram'),
  },
  {
    id: '_dummy',
    preview: {
      id: '_dummy',
      name: 'Prueba de contrato',
      tagline: 'El juego mínimo que implementa el contrato entero.',
      difficulties: [1, 3, 5],
      tags: ['lógica'],
      estimatedMinutes: [1, 2],
    },
    icon: DummyIcon,
    load: () => import('@games/_dummy'),
  },
];

export function findEntry(gameId: string): RegistryEntry | undefined {
  return REGISTRY.find((entry) => entry.id === gameId);
}
