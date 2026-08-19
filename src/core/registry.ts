import { type ComponentType } from 'react';

import { type AnyGameModule, type GameMeta } from './contract';

// The ONLY file in /core allowed to name a game — and only by string, by lazy
// import(), and by an icon small enough to ride in the initial bundle. The lint
// exemption for this exact path lives in eslint.config.js.
import { DummyIcon } from '@games/_dummy/sprites/DummyIcon';
import { MinesweeperIcon } from '@games/minesweeper/sprites/MinesweeperIcons';
import { NonogramIcon } from '@games/nonogram/sprites/NonogramIcons';
import { MemoryIcon } from '@games/memory/sprites/MemoryIcons';
import { QueensIcon } from '@games/queens/sprites/QueensIcons';
import { SimonIcon } from '@games/simon/sprites/SimonIcons';
import { TangoIcon } from '@games/tango/sprites/TangoIcons';
import { TrazoIcon } from '@games/trazo/sprites/TrazoIcons';
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
  /**
   * Se registra pero no se ofrece en Home.
   *
   * `_dummy` no es un juego, es la implementación mínima del contrato completo,
   * y su valor está en que el shell tenga que cargar un módulo que no conoce.
   * Tiene que seguir teniendo ruta y registro para que los tests lo ejerzan; lo
   * único que sobra es la tarjeta en la portada.
   */
  hidden?: boolean;
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
    id: 'tango',
    preview: {
      id: 'tango',
      name: 'Tango',
      tagline: 'Soles y lunas, tres de cada uno en cada línea.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      estimatedMinutes: [2, 10],
    },
    icon: TangoIcon,
    load: () => import('@games/tango'),
  },
  {
    id: 'queens',
    preview: {
      id: 'queens',
      name: 'Queens',
      tagline: 'Una corona por fila, por columna y por región.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      estimatedMinutes: [2, 12],
    },
    icon: QueensIcon,
    load: () => import('@games/queens'),
  },
  {
    id: 'memory',
    preview: {
      id: 'memory',
      name: 'Memoria',
      tagline: 'Cada figura está dos veces. Encontrá los pares.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['memoria'],
      estimatedMinutes: [1, 6],
    },
    icon: MemoryIcon,
    load: () => import('@games/memory'),
  },
  {
    id: 'trazo',
    preview: {
      id: 'trazo',
      name: 'Trazo',
      tagline: 'Un solo trazo que pase por los números en orden.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      estimatedMinutes: [2, 10],
    },
    icon: TrazoIcon,
    load: () => import('@games/trazo'),
  },
  {
    id: 'simon',
    preview: {
      id: 'simon',
      name: 'Simón',
      tagline: 'Repetí la secuencia. Cada ronda suma un paso.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['memoria', 'velocidad'],
      estimatedMinutes: [1, 5],
    },
    icon: SimonIcon,
    load: () => import('@games/simon'),
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
    hidden: true,
  },
];

export function findEntry(gameId: string): RegistryEntry | undefined {
  return REGISTRY.find((entry) => entry.id === gameId);
}
