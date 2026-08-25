import { type CampaignConfig, WINS_MAX } from './campaign';

/**
 * Los logros son de dos familias, y se guardan distinto.
 *
 * **Deducidos** — salen del historial que ya existe: "100 partidas jugadas",
 * "50 ganadas en Fácil", "racha de 20". No se guardan: se recalculan, igual que
 * las estadísticas (ver el comentario de `storage/stats.ts`, que explica por qué
 * un agregado guardado al lado del registro son dos verdades que se separan).
 *
 * **De evento** — no están en el historial y hay que grabarlos cuando pasan.
 * "Completaste una campaña" es el único por ahora: ningún resultado guardado
 * dice que una campaña terminó.
 *
 * Este archivo define los de evento. Cuando lleguen los deducidos, van a ser
 * otra lista que se calcula de las estadísticas, y la interfaz los va a mostrar
 * juntos sin que el jugador note la diferencia.
 */
export const CAMPAIGN_BADGE = 'campaign-complete';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export const TIER_LABELS: Record<BadgeTier, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
};

/**
 * Qué tan exigente fue la campaña, de 0 a 12.
 *
 * Se mide la CONFIGURACIÓN, no qué botón se tocó. Así un ajuste personalizado
 * tan duro como el preset hardcore se lleva el mismo oro — que es lo justo, y
 * además evita tener que inventar un logro por cada preset.
 *
 * Empezar más abajo suma porque la campaña es más larga; el conjunto grande
 * suma porque obliga a jugar juegos que quizá no manejás.
 */
export function demandScore(config: CampaignConfig): number {
  let score = config.winsPerLevel - 1;

  if (config.onLoss === 'reset') score += 2;
  if (config.onLoss === 'lives') {
    score += 3;
    if (config.lives <= 1) score += 1;
    if (!config.refillLives) score += 1;
  }

  if (config.startLevel === 1) score += 2;
  else if (config.startLevel <= 3) score += 1;

  if (config.pool.length >= 10) score += 1;

  return score;
}

export function campaignTier(config: CampaignConfig): BadgeTier {
  const score = demandScore(config);
  if (score >= 8) return 'gold';
  if (score >= 4) return 'silver';
  return 'bronze';
}

/** El máximo alcanzable, para poder decirle al jugador cuánto le falta. */
export const MAX_DEMAND = WINS_MAX - 1 + 3 + 1 + 1 + 2 + 1;

export interface BadgeDefinition {
  id: string;
  name: string;
  /** Qué hay que hacer. Se muestra también cuando NO está ganado. */
  requirement: string;
}

/**
 * Se muestran también los que faltan, en gris y con su condición: un logro
 * invisible no motiva a nadie.
 */
export const BADGES: BadgeDefinition[] = [
  {
    id: CAMPAIGN_BADGE,
    name: 'Campaña completada',
    requirement: 'Terminá una campaña llegando al final de Experto.',
  },
];
