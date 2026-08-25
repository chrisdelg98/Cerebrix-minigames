import { type LossPenalty } from '@storage/types';

import { type Difficulty } from './contract';

export const LEVELS: readonly Difficulty[] = [1, 2, 3, 4, 5];

/** El rango de victorias por nivel. Ver `WINS_MAX` para por qué se corta en 5. */
export const WINS_MIN = 1;

/**
 * Cinco y no diez.
 *
 * Con cinco niveles, N=5 ya son **25 partidas** — un par de horas. N=10 serían
 * cincuenta, que no es una campaña sino un segundo trabajo, y choca con una app
 * pensada para cinco minutos en el transporte. Para algo largo conviene bajar el
 * nivel de arranque, no subir esto.
 */
export const WINS_MAX = 5;

export interface CampaignConfig {
  winsPerLevel: number;
  startLevel: Difficulty;
  /** Ids de juego. Uno solo es válido: la campaña se queda en ese juego. */
  pool: string[];
  onLoss: LossPenalty;
  /** Vidas totales. Solo se usa con `onLoss: 'lives'`. */
  lives: number;
  /** Si las vidas se reponen al subir de nivel. */
  refillLives: boolean;
}

export interface Campaign {
  config: CampaignConfig;
  level: Difficulty;
  wins: number;
  livesLeft: number;
  /** Lo que queda por salir antes de rearmar el conjunto. */
  bag: string[];
  current: string;
  startedAt: number;
}

export type CampaignEvent =
  /** La ronda no movió el nivel: sigue la campaña. */
  | { kind: 'continue' }
  /** Se completó el tramo: se sube. */
  | { kind: 'level-up'; level: Difficulty }
  /** Se ganó el último tramo del último nivel. */
  | { kind: 'completed' }
  /** Se acabaron las vidas. */
  | { kind: 'failed' }
  /** Se perdió el progreso del nivel, pero la campaña sigue. */
  | { kind: 'level-reset' };

export type RoundOutcome = 'won' | 'lost' | 'draw';

/** Si un juego ofrece ese nivel. Por defecto todos ofrecen todos. */
export type Supports = (gameId: string, level: Difficulty) => boolean;

const always: Supports = () => true;

/**
 * Saca uno de la bolsa, rearmándola si hace falta.
 *
 * Bolsa y no dado: se baraja el conjunto entero y se saca **sin reponer**,
 * así todos pasan una vez antes de que se repita ninguno. Cuando se vacía, se
 * rearma y se vuelve a barajar. Es el mismo patrón que usa el Tetris para sus
 * piezas, y por el mismo motivo — un sorteo puro repite y se siente injusto.
 *
 * La bolsa a medio vaciar **se guarda con la campaña**: rearmarla al abrir la
 * app rompería justamente la promesa que la hace valer la pena.
 */
export function drawFrom(
  bag: readonly string[],
  pool: readonly string[],
  level: Difficulty,
  random: () => number,
  supports: Supports = always
): { id: string; bag: string[] } {
  const usable = pool.filter((id) => supports(id, level));
  // Si ninguno ofrece ese nivel, se juega igual con lo que hay: quedarse sin
  // ronda sería peor que jugar una a otro nivel.
  const source = usable.length > 0 ? usable : [...pool];

  let rest = bag.filter((id) => source.includes(id));
  if (rest.length === 0) {
    rest = [...source];
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [rest[i], rest[j]] = [rest[j] as string, rest[i] as string];
    }
  }

  const id = rest[rest.length - 1] ?? source[0] ?? '';
  return { id, bag: rest.slice(0, -1) };
}

export function startCampaign(
  config: CampaignConfig,
  random: () => number = Math.random,
  supports: Supports = always
): Campaign {
  const { id, bag } = drawFrom([], config.pool, config.startLevel, random, supports);
  return {
    config,
    level: config.startLevel,
    wins: 0,
    livesLeft: config.lives,
    bag,
    current: id,
    startedAt: Date.now(),
  };
}

/**
 * Qué pasa después de una ronda.
 *
 * Devuelve la campaña siguiente y qué ocurrió. `campaign: null` es el final —
 * completada o sin vidas — y el que llama decide qué mostrar.
 *
 * El empate cuenta como "no ganaste, pero tampoco perdiste": no suma ni
 * castiga. Es coherente con la racha, donde un empate tampoco corta.
 */
export function afterRound(
  campaign: Campaign,
  outcome: RoundOutcome,
  random: () => number = Math.random,
  supports: Supports = always
): { campaign: Campaign | null; event: CampaignEvent } {
  const { config } = campaign;

  if (outcome === 'lost') {
    if (config.onLoss === 'lives') {
      const livesLeft = campaign.livesLeft - 1;
      if (livesLeft <= 0) return { campaign: null, event: { kind: 'failed' } };
      const next = drawFrom(campaign.bag, config.pool, campaign.level, random, supports);
      return {
        campaign: { ...campaign, livesLeft, current: next.id, bag: next.bag },
        event: { kind: 'continue' },
      };
    }

    const next = drawFrom(campaign.bag, config.pool, campaign.level, random, supports);
    if (config.onLoss === 'reset') {
      return {
        campaign: { ...campaign, wins: 0, current: next.id, bag: next.bag },
        event: { kind: 'level-reset' },
      };
    }
    return {
      campaign: { ...campaign, current: next.id, bag: next.bag },
      event: { kind: 'continue' },
    };
  }

  if (outcome === 'draw') {
    const next = drawFrom(campaign.bag, config.pool, campaign.level, random, supports);
    return {
      campaign: { ...campaign, current: next.id, bag: next.bag },
      event: { kind: 'continue' },
    };
  }

  const wins = campaign.wins + 1;
  if (wins < config.winsPerLevel) {
    const next = drawFrom(campaign.bag, config.pool, campaign.level, random, supports);
    return {
      campaign: { ...campaign, wins, current: next.id, bag: next.bag },
      event: { kind: 'continue' },
    };
  }

  if (campaign.level >= 5) return { campaign: null, event: { kind: 'completed' } };

  const level = (campaign.level + 1) as Difficulty;
  const next = drawFrom(campaign.bag, config.pool, level, random, supports);
  return {
    campaign: {
      ...campaign,
      level,
      wins: 0,
      livesLeft: config.refillLives ? config.lives : campaign.livesLeft,
      current: next.id,
      bag: next.bag,
    },
    event: { kind: 'level-up', level },
  };
}

/** Cuántas rondas ganadas hacen falta para terminar, desde el arranque. */
export function totalWins(config: CampaignConfig): number {
  return (LEVELS.length - config.startLevel + 1) * config.winsPerLevel;
}

export interface CampaignPreset {
  id: string;
  name: string;
  hint: string;
  /** Todo menos el conjunto, que lo elige el jugador aparte. */
  config: Omit<CampaignConfig, 'pool'>;
}

/**
 * Tres puntos de partida, para que configurar no sea un formulario.
 *
 * No son modos distintos: son valores que llenan los mismos campos, y se pueden
 * tocar después. El logro no mira qué preset se eligió sino cuán exigente quedó
 * la configuración — ver `badges.ts` —, así que un ajuste a mano tan duro como
 * el hardcore vale lo mismo.
 */
export const PRESETS: CampaignPreset[] = [
  {
    id: 'relaxed',
    name: 'Tranquila',
    hint: 'Una victoria por nivel y perder no cuesta nada.',
    config: { winsPerLevel: 1, startLevel: 1, onLoss: 'none', lives: 3, refillLives: true },
  },
  {
    id: 'classic',
    name: 'Clásica',
    hint: 'Dos por nivel. Perder te reinicia el tramo.',
    config: { winsPerLevel: 2, startLevel: 1, onLoss: 'reset', lives: 3, refillLives: true },
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    hint: 'Cinco por nivel y una sola vida para toda la campaña.',
    config: { winsPerLevel: 5, startLevel: 1, onLoss: 'lives', lives: 1, refillLives: false },
  },
];
