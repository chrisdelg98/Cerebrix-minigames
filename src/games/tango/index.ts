import { defineGame } from '@core/contract';

import { tangoEngine } from './engine/tangoEngine';
import { TangoIcon } from './sprites/TangoIcons';
import { SignExample, TripleExample } from './view/Examples';
import { TangoView } from './view/TangoView';

export default defineGame({
  meta: {
    id: 'tango',
    name: 'Tango',
    tagline: 'Soles y lunas, tres de cada uno en cada línea.',
    icon: TangoIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    category: 'lógica',
    estimatedMinutes: [2, 10],

    howToPlay: [
      'Llená el tablero de 6×6 con soles y lunas. Tocá una casilla para ir cambiando: vacía, sol, luna.',
      'Cada fila y cada columna lleva exactamente tres soles y tres lunas.',
      'Nunca puede haber tres iguales seguidos, ni en horizontal ni en vertical.',
      'Las casillas separadas por = son del mismo tipo; las separadas por × son distintas.',
      'Cada tablero tiene una sola solución y se saca razonando: nunca hay que adivinar.',
    ],

    examples: [
      { figure: TripleExample, caption: 'Dos iguales seguidos van bien. Tres, nunca.' },
      { figure: SignExample, caption: 'El = pide dos iguales; el × pide dos distintos.' },
    ],

    stateVersion: 1,
  },

  engine: tangoEngine,
  View: TangoView,
});
