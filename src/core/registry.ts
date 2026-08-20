import { type ComponentType } from 'react';

import { type AnyArcadeModule } from './arcade';
import { type AnyGameModule, type GameMeta } from './contract';

// The ONLY file in /core allowed to name a game — and only by string, by lazy
// import(), and by an icon small enough to ride in the initial bundle. The lint
// exemption for this exact path lives in eslint.config.js.
import { Game2048Icon } from '@games/2048/sprites/Game2048Icons';
import { SnakeIcon } from '@games/snake/sprites/SnakeIcons';
import { ApagonIcon } from '@games/apagon/sprites/ApagonIcons';
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
interface EntryBase {
  id: string;
  /** Light metadata, so Home can paint a card without downloading the game. */
  preview: Pick<
    GameMeta,
    'id' | 'name' | 'tagline' | 'difficulties' | 'tags' | 'category' | 'estimatedMinutes'
  >;
  /** The icon IS a static import: ~1 kB, and Home needs it immediately. */
  icon: ComponentType<{ size?: number }>;
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

/**
 * Quién produce el estado: el jugador o el reloj.
 *
 * `kind` es del shell y decide qué maquinaria corre — la pila de deshacer y el
 * autoguardado, o un reloj y una pausa. No confundir con `preview.category`,
 * que es del jugador y decide en qué estante de la portada aparece: Simón y
 * 2048 están en el estante «arcade» y son por turnos.
 */
export interface TurnEntry extends EntryBase {
  /** Ausente es por turnos, que es lo que son casi todos. */
  kind?: 'turnos';
  /** The whole game, lazily. Never part of the initial bundle. */
  load: () => Promise<{ default: AnyGameModule }>;
}

export interface ClockEntry extends EntryBase {
  kind: 'reloj';
  load: () => Promise<{ default: AnyArcadeModule }>;
}

export type RegistryEntry = TurnEntry | ClockEntry;

/** La ruta que le corresponde según quién produce su estado. */
export function pathFor(entry: RegistryEntry): string {
  return entry.kind === 'reloj' ? `/arcade/${entry.id}` : `/game/${entry.id}`;
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
      category: 'lógica',
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
      category: 'lógica',
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
      category: 'lógica',
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
      category: 'lógica',
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
      category: 'lógica',
      estimatedMinutes: [2, 12],
    },
    icon: QueensIcon,
    load: () => import('@games/queens'),
  },
  {
    id: 'apagon',
    preview: {
      id: 'apagon',
      name: 'Apagón',
      tagline: 'Apagá todas las luces. Cada toque prende y apaga de a cinco.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['lógica'],
      category: 'lógica',
      estimatedMinutes: [1, 8],
    },
    icon: ApagonIcon,
    load: () => import('@games/apagon'),
  },
  {
    id: 'memory',
    preview: {
      id: 'memory',
      name: 'Memoria',
      tagline: 'Cada figura está dos veces. Encontrá los pares.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['memoria'],
      category: 'arcade',
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
      category: 'lógica',
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
      category: 'arcade',
      estimatedMinutes: [1, 5],
    },
    icon: SimonIcon,
    load: () => import('@games/simon'),
  },
  {
    id: '2048',
    preview: {
      id: '2048',
      name: '2048',
      tagline: 'Juntá fichas iguales y hacelas crecer.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['cálculo'],
      category: 'arcade',
      estimatedMinutes: [2, 12],
    },
    icon: Game2048Icon,
    load: () => import('@games/2048'),
  },
  {
    id: 'snake',
    kind: 'reloj',
    preview: {
      id: 'snake',
      name: 'Snake',
      tagline: 'Comé y crecé sin chocarte. No para de moverse.',
      difficulties: [1, 2, 3, 4, 5],
      tags: ['velocidad'],
      category: 'arcade',
      estimatedMinutes: [1, 4],
    },
    icon: SnakeIcon,
    load: () => import('@games/snake'),
  },
  {
    id: '_dummy',
    preview: {
      id: '_dummy',
      name: 'Prueba de contrato',
      tagline: 'El juego mínimo que implementa el contrato entero.',
      difficulties: [1, 3, 5],
      tags: ['lógica'],
      category: 'lógica',
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
