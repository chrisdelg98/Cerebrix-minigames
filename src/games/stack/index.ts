import { defineArcade } from '@core/arcade';

import { stackEngine } from './engine/stackEngine';
import { StackIcon } from './sprites/StackIcons';
import { PerfectExample, TrimExample } from './view/Examples';
import { StackView } from './view/StackView';

export default defineArcade({
  meta: {
    id: 'stack',
    name: 'Torre de bloques',
    tagline: 'Soltá cada bloque justo encima. Lo que sobresale se cae.',
    icon: StackIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['velocidad'],
    category: 'arcade',
    estimatedMinutes: [1, 4],

    howToPlay: [
      'El bloque va y viene solo. Tocá el tablero para soltarlo.',
      'Lo que quede fuera del bloque de abajo se cae, y con lo que sobra seguís jugando: cada error te deja una base más angosta.',
      'Si lo clavás justo encima recuperás una ranura de ancho, hasta el tamaño con el que empezaste. Apuntar rinde más que apurarse.',
      'Cada piso acelera un poco el vaivén.',
      'Ganás al levantar los pisos que pide el nivel. Se termina cuando no queda nada dónde apoyar.',
    ],

    examples: [
      { figure: TrimExample, caption: 'Lo que sobresale del bloque de abajo se cae.' },
      { figure: PerfectExample, caption: 'Clavarlo justo devuelve algo de lo perdido.' },
    ],
  },

  engine: stackEngine,
  View: StackView,
});
