import { defineGame } from '@core/contract';

import { connectFourEngine, DUO_MODE } from './engine/connectFourEngine';
import { ConnectFourIcon } from './sprites/ConnectFourIcons';
import { GravityExample, LineExample } from './view/Examples';
import { ConnectFourView } from './view/ConnectFourView';

export default defineGame({
  meta: {
    id: 'connect-four',
    name: 'Conecta 4',
    tagline: 'Cuatro en línea antes que el otro. Contra la máquina o contra quien tengas al lado.',
    icon: ConnectFourIcon,
    difficulties: [1, 2, 3, 4, 5],
    tags: ['lógica'],
    category: 'lógica',
    estimatedMinutes: [2, 5],

    modes: [
      { id: 'machine', label: 'Contra la máquina', ranked: true },
      { id: DUO_MODE, label: 'Dos jugadores', ranked: false },
    ],

    howToPlay: [
      'El objetivo es alinear cuatro fichas tuyas: en fila, en columna o en diagonal. Vos jugás con las rojas y siempre empezás.',
      'Tocá una columna para soltar tu ficha. No elegís la casilla: la ficha cae hasta el fondo, sobre las que ya estaban.',
      'Ganás si completás una línea de cuatro. Perdés si la completa el otro.',
      'Si se llena el tablero y nadie alineó cuatro, es empate — y un empate no corta tu racha.',
      'Los cinco niveles son la misma máquina jugando cada vez mejor. El nivel 5 nunca se equivoca, pero se le puede ganar igual: mira cinco jugadas hacia adelante, así que ganarle es ver más lejos que él.',
    ],

    examples: [
      { figure: LineExample, caption: 'Cuatro en línea vale en fila, en columna o en diagonal.' },
      { figure: GravityExample, caption: 'Elegís la columna: la ficha cae sola hasta el fondo.' },
    ],

    /* Deshacer saca tu ficha Y la respuesta de la máquina, porque las dos salen
       de la misma jugada. */
    supportsUndo: true,
    stateVersion: 1,
  },

  engine: connectFourEngine,
  View: ConnectFourView,
});
