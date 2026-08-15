import { defineGame } from '@core/contract';

import { dummyEngine } from './engine/dummyEngine';
import { type DummyMove } from './engine/types';
import { DummyIcon } from './sprites/DummyIcon';
import { WinIcon } from './sprites/WinIcon';
import { DummyView } from './view/DummyView';

/**
 * The contract's living test. It is NOT deleted when real games arrive: when
 * the contract changes, this is the first thing updated, and if updating it
 * hurts, the change is wrong (docs/GAME_CONTRACT.md §7).
 */
export default defineGame({
  meta: {
    id: '_dummy',
    name: 'Prueba de contrato',
    tagline: 'El juego mínimo que implementa el contrato entero.',
    icon: DummyIcon,
    difficulties: [1, 3, 5],
    tags: ['lógica'],
    estimatedMinutes: [1, 2],
    howToPlay: [
      'Tocá cada casilla para marcarla.',
      'Marcá todas y ganás.',
      'El botón "Ganar" las marca todas de una.',
    ],
    stateVersion: 1,
  },

  engine: dummyEngine,
  View: DummyView,

  actions: [
    {
      id: 'win-now',
      label: 'Ganar',
      icon: WinIcon,
      toMove: (): DummyMove => ({ kind: 'winNow' }),
    },
  ],
});
