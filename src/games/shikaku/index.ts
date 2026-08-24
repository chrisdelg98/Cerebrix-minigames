import { defineGame } from '@core/contract';

import { shikakuEngine } from './engine/shikakuEngine';
import { ShikakuIcon } from './sprites/ShikakuIcons';
import { AreaExample, OneNumberExample } from './view/Examples';
import { ShikakuView } from './view/ShikakuView';

export default defineGame({
  meta: {
    id: 'shikaku',
    name: 'Shikaku',
    tagline: 'Repartí el tablero en rectángulos. Cada uno con su número.',
    icon: ShikakuIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    category: 'lógica',
    estimatedMinutes: [3, 12],

    howToPlay: [
      'El objetivo es repartir TODO el tablero en rectángulos, sin que sobre ninguna casilla ni se pisen entre ellos.',
      'Cada rectángulo tiene que contener exactamente un número, y su área tiene que ser ese número: un 6 puede ser 6×1, 3×2, 2×3 o 1×6.',
      'Arrastrá de una esquina a la otra para dibujarlo. Mientras arrastrás ves cuánto llevás y cuánto pide el número.',
      'Para corregir, dibujá encima: el rectángulo nuevo reemplaza lo que pise. Y tocando uno ya puesto lo sacás.',
      'No se puede perder ni quedar trabado. El tablero tiene una sola solución, así que todo se deduce.',
    ],

    examples: [
      { figure: AreaExample, caption: 'El número dice el ÁREA, no la forma: un 4 es 4×1 o 2×2.' },
      { figure: OneNumberExample, caption: 'Un solo número por rectángulo. Nunca dos.' },
    ],

    supportsUndo: true,
    stateVersion: 1,
  },

  engine: shikakuEngine,
  View: ShikakuView,
});
