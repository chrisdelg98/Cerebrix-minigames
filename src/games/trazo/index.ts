import { defineGame } from '@core/contract';

import { trazoEngine } from './engine/trazoEngine';
import { TrazoIcon } from './sprites/TrazoIcons';
import { CoverExample, OrderExample } from './view/Examples';
import { TrazoView } from './view/TrazoView';

export default defineGame({
  meta: {
    id: 'trazo',
    name: 'Trazo',
    tagline: 'Un solo trazo que pase por los números en orden.',
    icon: TrazoIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    estimatedMinutes: [2, 10],

    howToPlay: [
      'Arrancá en el 1 y arrastrá el dedo de una casilla a la de al lado, sin levantarlo.',
      'Tenés que pasar por los números en orden: del 1 al 2, del 2 al 3, y así hasta el último.',
      'El trazo tiene que cubrir todas las casillas del tablero, sin repetir ninguna.',
      'Para corregir, arrastrá hacia atrás sobre el propio trazo, o empezá desde cualquier punto de él para recortarlo hasta ahí.',
      'En otras plataformas este juego se llama Zip.',
    ],

    examples: [
      {
        figure: OrderExample,
        caption: 'Los números se tocan en orden: primero el 1, después el 2.',
      },
      { figure: CoverExample, caption: 'Y no puede quedar ninguna casilla sin recorrer.' },
    ],

    stateVersion: 1,
  },

  engine: trazoEngine,
  View: TrazoView,
});
