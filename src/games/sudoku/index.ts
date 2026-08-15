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
    howToPlay: [
      'Completá la grilla para que del 1 al 9 aparezca una sola vez en cada fila, cada columna y cada caja de 3×3.',
      'Elegí una casilla y escribí con el teclado numérico, o con las teclas 1-9 y las flechas.',
      'Con "Notas" anotás los candidatos posibles en chiquito, sin comprometerte todavía.',
      'Si un número repite en su fila, columna o caja, se marca en rojo.',
    ],
    stateVersion: 1,
  },

  engine: sudokuEngine,
  View: SudokuView,
  // No footer actions: pencil mode lives in the number pad, where the finger
  // already is. See the note in NumberPad.tsx.
});
