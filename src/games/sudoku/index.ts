import { defineGame } from '@core/contract';

import { sudokuEngine } from './engine/sudokuEngine';
import { SudokuIcon } from './sprites/SudokuIcons';
import { SudokuView } from './view/SudokuView';

/**
 * The first real game. Everything it needs from the shell — timer, difficulty,
 * autosave, undo, hints, the outcome modal — it gets by implementing the
 * contract, without /core knowing that Sudoku exists.
 */
export default defineGame({
  meta: {
    id: 'sudoku',
    name: 'Sudoku',
    tagline: 'El clásico 9×9, con anotaciones y pistas.',
    icon: SudokuIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    estimatedMinutes: [5, 25],
    stateVersion: 1,
  },

  engine: sudokuEngine,
  View: SudokuView,
  // No footer actions: pencil mode lives in the number pad, where the finger
  // already is. See the note in NumberPad.tsx.
});
