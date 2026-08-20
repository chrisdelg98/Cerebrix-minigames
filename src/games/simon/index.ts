import { defineGame } from '@core/contract';

import { simonEngine } from './engine/simonEngine';
import { SimonIcon } from './sprites/SimonIcons';
import { GrowExample, SequenceExample } from './view/Examples';
import { SimonView } from './view/SimonView';

export default defineGame({
  meta: {
    id: 'simon',
    name: 'Secuencia',
    tagline: 'Mirá y repetí. Cada ronda suma un paso.',
    icon: SimonIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['memoria', 'velocidad'],
    category: 'arcade',
    estimatedMinutes: [1, 5],

    howToPlay: [
      'Mirá cómo se encienden las pastillas, una por una, y esperá a que termine.',
      'Después repetí la misma secuencia tocándolas en el mismo orden.',
      'Cada ronda que superás agrega un paso más al final, y el resto no cambia.',
      'Un solo error termina la partida: no hay segundo intento dentro de la misma secuencia.',
    ],

    examples: [
      { figure: SequenceExample, caption: 'Te muestran una secuencia y la repetís igual.' },
      {
        figure: GrowExample,
        caption: 'Cada ronda agrega un paso al final. Lo anterior no cambia.',
      },
    ],

    /* Deshacer una pulsación equivocada sería jugar de nuevo el paso que ya
       fallaste, y acordarse es todo el juego. Mismo motivo que en Memoria. */
    supportsUndo: false,

    stateVersion: 1,
  },

  engine: simonEngine,
  View: SimonView,
});
