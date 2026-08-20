import { defineGame } from '@core/contract';

import { lightsOutEngine } from './engine/lightsOutEngine';
import { LightsOutIcon } from './sprites/LightsOutIcons';
import { CrossExample, EdgeExample } from './view/Examples';
import { LightsOutView } from './view/LightsOutView';

export default defineGame({
  meta: {
    id: 'lights-out',
    name: 'Lights Out',
    tagline: 'Apagá todas las luces. Cada toque prende y apaga de a cinco.',
    icon: LightsOutIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    category: 'lógica',
    estimatedMinutes: [1, 8],

    howToPlay: [
      'El objetivo es dejar el tablero entero apagado.',
      'Tocar una casilla no la cambia solo a ella: cambia también sus cuatro vecinas de arriba, abajo, izquierda y derecha. Lo prendido se apaga y lo apagado se prende.',
      'Contra un borde o en una esquina la cruz viene cortada, así que cambian cuatro casillas o tres.',
      'No se puede perder ni quedar trabado: tocar dos veces la misma casilla deja todo como estaba, así que siempre se puede volver atrás.',
      'El orden no importa. Lo único que cuenta es CUÁLES tocaste, y cada una cuenta una sola vez.',
    ],

    examples: [
      { figure: CrossExample, caption: 'Un toque cambia la casilla y sus cuatro vecinas.' },
      { figure: EdgeExample, caption: 'Contra el borde la cruz se corta: cambian menos.' },
    ],

    stateVersion: 1,
  },

  engine: lightsOutEngine,
  View: LightsOutView,
});
