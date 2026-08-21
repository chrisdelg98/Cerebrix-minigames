import { defineGame } from '@core/contract';

import { DUO_MODE, ticTacToeEngine } from './engine/ticTacToeEngine';
import { TicTacToeIcon } from './sprites/TicTacToeIcons';
import { BlockExample, LineExample } from './view/Examples';
import { TicTacToeView } from './view/TicTacToeView';

export default defineGame({
  meta: {
    id: 'tic-tac-toe',
    name: 'Tres en línea',
    tagline: 'Tres tuyas en fila. Contra la máquina o contra quien tengas al lado.',
    icon: TicTacToeIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    category: 'lógica',
    estimatedMinutes: [1, 3],

    modes: [
      { id: 'machine', label: 'Contra la máquina', ranked: true },
      { id: DUO_MODE, label: 'Dos jugadores', ranked: false },
    ],

    howToPlay: [
      'El objetivo es poner tres fichas tuyas en línea: en fila, en columna o en diagonal. Vos jugás con las X y siempre empezás.',
      'Tocá cualquier casilla vacía para poner tu ficha. Contra la máquina, ella responde en el acto.',
      'Ganás si completás una línea de tres. Perdés si la completa el otro.',
      'Si se llena el tablero y nadie hizo línea, es empate — y un empate no corta tu racha.',
      'Los cinco niveles son la misma máquina jugando cada vez mejor: siempre calcula la mejor jugada, y lo que cambia es cuánto se deja llevar. Incluso el más alto se puede ganar, porque no juega perfecto a propósito — una máquina perfecta en este juego sería imposible de ganar.',
    ],

    examples: [
      { figure: LineExample, caption: 'Las tres formas de hacer línea: fila, columna o diagonal.' },
      {
        figure: BlockExample,
        caption: 'Si al otro le falta una para cerrar, tapar esa casilla es la jugada.',
      },
    ],

    /* Deshacer saca tu ficha Y la respuesta de la máquina, porque las dos salen
       de la misma jugada. Te devuelve a donde estabas decidiendo. */
    supportsUndo: true,
    stateVersion: 1,
  },

  engine: ticTacToeEngine,
  View: TicTacToeView,
});
