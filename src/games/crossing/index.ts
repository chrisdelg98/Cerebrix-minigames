import { defineArcade } from '@core/arcade';

import { crossingEngine } from './engine/crossingEngine';
import { CrossingIcon } from './sprites/CrossingIcons';
import { GapExample, WaitExample } from './view/Examples';
import { CrossingView } from './view/CrossingView';

export default defineArcade({
  meta: {
    id: 'crossing',
    name: 'Cruzar la calle',
    tagline: 'Avanzá fila por fila sin que te pase un auto por encima.',
    icon: CrossingIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['velocidad'],
    category: 'arcade',
    estimatedMinutes: [1, 5],

    howToPlay: [
      'El objetivo es avanzar hasta la fila que pide el nivel, que ves arriba del tablero.',
      'Tocá el tablero para dar un paso adelante, o deslizá en cualquier dirección para elegir hacia dónde: también podés retroceder y moverte de costado.',
      'Los autos NO se detienen. Un auto que te alcanza te saca de la partida, y meterte debajo de uno también.',
      'Moverte no adelanta el reloj: podés quedarte en una vereda todo lo que quieras estudiando el tráfico antes de cruzar.',
      'Cuanto más lejos llegás, más rápido va todo. La dificultad la elegís vos cada vez que decidís cruzar.',
    ],

    examples: [
      { figure: GapExample, caption: 'El hueco se mira antes de cruzar, no durante.' },
      { figure: WaitExample, caption: 'Esperar es gratis: el reloj no corre por moverte.' },
    ],
  },

  engine: crossingEngine,
  View: CrossingView,
});
