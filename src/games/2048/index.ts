import { defineGame } from '@core/contract';

import { game2048Engine } from './engine/game2048Engine';
import { Game2048Icon } from './sprites/Game2048Icons';
import { DifferentExample, MergeExample, OnceExample } from './view/Examples';
import { Game2048View } from './view/Game2048View';

export default defineGame({
  meta: {
    id: '2048',
    name: '2048',
    tagline: 'Juntá fichas iguales y hacelas crecer.',
    icon: Game2048Icon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['cálculo'],
    category: 'arcade',
    estimatedMinutes: [2, 12],

    /*
     * El objetivo va primero, y dice explícitamente que no son los puntos.
     *
     * Antes esto arrancaba explicando cómo se mueve el tablero y nunca decía
     * qué había que lograr. Alguien que no jugó nunca leía las reglas enteras
     * sin enterarse de que la meta es UNA ficha, veía «puntos 256, meta 256» y
     * daba por ganada una partida que recién empezaba.
     */
    howToPlay: [
      'El objetivo es fabricar UNA ficha grande: la que pide el nivel, que ves arriba del tablero al lado de «Ficha». Los puntos son solo un marcador, no la meta.',
      'No se mueve una ficha sola. Deslizá sobre el tablero — o usá las flechas — y todas se van para ese lado a la vez, hasta donde puedan.',
      'Si dos fichas del MISMO número se chocan al empujar, se fusionan en una que vale el doble: 2 y 2 dan 4, 4 y 4 dan 8. Dos números distintos no se juntan nunca.',
      'Después de cada jugada aparece una ficha nueva en un lugar libre, así que el tablero se va llenando: la única forma de hacer espacio es fusionar.',
      'Perdés si el tablero se llena y ya no queda ningún lado que mueva algo.',
    ],

    examples: [
      { figure: MergeExample, caption: 'Dos iguales que se chocan valen el doble.' },
      {
        figure: DifferentExample,
        caption: 'Dos números distintos se acomodan, pero no se fusionan.',
      },
      {
        figure: OnceExample,
        caption: 'Cada ficha se fusiona una sola vez por jugada.',
      },
    ],

    stateVersion: 1,
  },

  engine: game2048Engine,
  View: Game2048View,
});
