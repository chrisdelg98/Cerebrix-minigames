import { defineGame } from '@core/contract';

import { nonogramEngine } from './engine/nonogramEngine';
import { NonogramIcon } from './sprites/NonogramIcons';
import { OverlapExample, ReadingExample } from './view/Examples';
import { NonogramView } from './view/NonogramView';

export default defineGame({
  meta: {
    id: 'nonogram',
    name: 'Nonograma',
    tagline: 'Los números dicen qué pintar. Sale una figura.',
    icon: NonogramIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    category: 'lógica',
    estimatedMinutes: [3, 20],

    /*
     * Short sentences, one idea each, in the order someone needs them: qué
     * significan los números, cómo se juega, y recién después la promesa de que
     * no hay que adivinar. Los dos ejemplos hacen el trabajo que un párrafo no
     * puede hacer.
     */
    howToPlay: [
      'Los números de cada fila y cada columna dicen cuántas casillas seguidas van pintadas, y en qué orden.',
      'Entre un grupo y el siguiente siempre queda al menos una casilla vacía.',
      'Tocá una casilla para pintarla. Pasá a «Descartar» para marcar con ✕ las que ya sabés que van vacías: son las que te dejan avanzar.',
      'Nunca hace falta adivinar. Todo tablero se puede terminar razonando fila por fila y columna por columna.',
    ],

    examples: [
      {
        figure: ReadingExample,
        caption: '«3 1» son tres pintadas juntas, un hueco, y después una sola. Nada más.',
      },
      {
        figure: OverlapExample,
        caption:
          'Un 4 en cinco casillas entra de dos maneras. Las tres del medio se pintan en las dos, así que van seguro.',
      },
    ],

    stateVersion: 1,
  },

  engine: nonogramEngine,
  View: NonogramView,
  // No footer actions: painting and discarding live above the board, next to
  // the thumb, for the same reason Sudoku's pencil went into its number pad.
});
