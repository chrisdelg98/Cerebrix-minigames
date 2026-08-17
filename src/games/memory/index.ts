import { defineGame } from '@core/contract';

import { memoryEngine } from './engine/memoryEngine';
import { MemoryIcon } from './sprites/MemoryIcons';
import { MemoExample, PairExample } from './view/Examples';
import { MemoryView } from './view/MemoryView';

export default defineGame({
  meta: {
    id: 'memory',
    name: 'Memoria',
    tagline: 'Cada figura está dos veces. Encontrá los pares.',
    icon: MemoryIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['memoria'],
    estimatedMinutes: [1, 6],

    howToPlay: [
      'Todas las cartas empiezan tapadas, y cada figura está escondida exactamente dos veces.',
      'Tocá una carta para darla vuelta, y después otra. Si son iguales se quedan destapadas; si no, se vuelven a tapar solas.',
      'No hace falta esperar: tocando una tercera carta las dos anteriores se tapan en el acto.',
      'Ganás cuando encontrás todos los pares. Cada carta que destapás te dice algo, aunque no aciertes.',
    ],

    examples: [
      {
        figure: PairExample,
        caption: 'Dos figuras iguales se quedan. Dos distintas se vuelven a tapar.',
      },
      {
        figure: MemoExample,
        caption: 'Acordate de dónde viste cada una: el par lo ganás antes de darlo vuelta.',
      },
    ],

    /*
     * Deshacer devolvería la carta a su lugar, pero no te haría olvidar lo que
     * viste. Sería un botón para hacer trampa contra vos mismo.
     */
    supportsUndo: false,

    stateVersion: 1,
  },

  engine: memoryEngine,
  View: MemoryView,
});
