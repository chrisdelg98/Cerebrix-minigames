import { defineGame } from '@core/contract';

import { minesweeperEngine } from './engine/minesweeperEngine';
import { MinesweeperIcon } from './sprites/MinesweeperIcons';
import { MinesweeperView } from './view/MinesweeperView';

/**
 * The acid test of docs/PLAN.md phase 6. It shares the grid model with Sudoku
 * but breaks assumptions Sudoku never did: the board is not square, most of the
 * state is hidden, there is a way to lose, and there is a second gesture.
 */
export default defineGame({
  meta: {
    id: 'minesweeper',
    name: 'Buscaminas',
    tagline: 'Despejá el campo sin pisar una mina.',
    icon: MinesweeperIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    estimatedMinutes: [2, 15],
    howToPlay: [
      'Tocá una casilla para descubrirla. La primera nunca es una mina.',
      'El número dice cuántas minas hay en las ocho casillas que la rodean.',
      'Mantené apretado (o click derecho) para marcar una mina con una bandera.',
      'Tocá un número ya descubierto y, si tiene todas sus banderas puestas, despeja lo que queda alrededor.',
      'Ganás cuando descubriste todo lo que no es mina.',
    ],
    stateVersion: 1,
  },

  engine: minesweeperEngine,
  View: MinesweeperView,
});
