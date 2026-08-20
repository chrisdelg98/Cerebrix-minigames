import { defineArcade } from '@core/arcade';

import { snakeEngine } from './engine/snakeEngine';
import { SnakeIcon } from './sprites/SnakeIcons';
import { CrashExample, GrowExample } from './view/Examples';
import { SnakeView } from './view/SnakeView';

export default defineArcade({
  meta: {
    id: 'snake',
    name: 'Snake',
    tagline: 'Comé y crecé sin chocarte. No para de moverse.',
    icon: SnakeIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['velocidad'],
    category: 'arcade',
    estimatedMinutes: [1, 4],

    howToPlay: [
      'La víbora NUNCA se detiene: vos solo elegís hacia dónde dobla.',
      'Deslizá el dedo sobre el tablero en la dirección que querés tomar — o usá las flechas. No hace falta levantar el dedo entre giro y giro.',
      'Cada fruta que comés te agrega un segmento y acelera un poco el paso.',
      'Chocar contra una pared o contra tu propio cuerpo termina la partida. No podés darte vuelta en el lugar.',
      'Ganás al llegar al largo que pide el nivel, que ves arriba del tablero.',
    ],

    examples: [
      { figure: GrowExample, caption: 'Cada fruta te suma un segmento.' },
      { figure: CrashExample, caption: 'La pared y tu propio cuerpo terminan la partida.' },
    ],
  },

  engine: snakeEngine,
  View: SnakeView,
});
