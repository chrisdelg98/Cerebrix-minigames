import { defineGame } from '@core/contract';

import { queensEngine } from './engine/queensEngine';
import { QueensIcon } from './sprites/QueensIcons';
import { LineExample, TouchExample } from './view/Examples';
import { QueensView } from './view/QueensView';

export default defineGame({
  meta: {
    id: 'queens',
    name: 'Queens',
    tagline: 'Una corona por fila, por columna y por región.',
    icon: QueensIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    estimatedMinutes: [2, 12],

    howToPlay: [
      'Poné exactamente una corona en cada fila, en cada columna y en cada región de color.',
      'Dos coronas no pueden tocarse: ni de costado, ni arriba o abajo, ni en diagonal.',
      'Tocá una vez para marcar con ✕ dónde ya sabés que no va ninguna, y otra vez para poner la corona.',
      'Cada tablero tiene una sola solución, y se saca razonando: nunca hay que adivinar.',
    ],

    examples: [
      { figure: LineExample, caption: 'Una corona por fila y por columna. Nunca dos en la misma.' },
      { figure: TouchExample, caption: 'Y no pueden tocarse, ni siquiera por la esquina.' },
    ],

    stateVersion: 1,
  },

  engine: queensEngine,
  View: QueensView,
});
