import { StatTile } from '@design/components/StatTile';
import { GamepadIcon, TargetIcon } from '@design/sprites/SettingsIcons';
import { Streak } from '@design/sprites/Streak';
import { Trophy } from '@design/sprites/Trophy';
import { type GlobalStats } from '@storage/index';

import s from './GlobalStatsPanel.module.css';

export interface GlobalStatsPanelProps {
  stats: GlobalStats;
  /**
   * En un teléfono deja solo la racha, a lo ancho.
   *
   * Las cuatro fichas se comían casi un tercio de la primera pantalla, y esa
   * pantalla tiene un trabajo: mostrar juegos. Las otras tres no se pierden —
   * el historial las muestra completas, y en la portada el panel entero es un
   * enlace hacia ahí.
   *
   * Se decide por CSS y no por JavaScript a propósito: preguntarle el ancho al
   * navegador para elegir qué renderizar hace que la primera pintura sea la
   * equivocada, y encima habría dos árboles distintos que mantener.
   */
  collapse?: boolean;
}

/**
 * Las cuatro cifras globales. Vive en dos lugares —la portada y el historial—
 * así que vive en uno solo y se usa dos veces.
 */
export function GlobalStatsPanel({ stats, collapse = false }: GlobalStatsPanelProps) {
  return (
    <div className={s.stats} data-collapse={collapse}>
      <div className={s.tile} data-secondary="true">
        <StatTile label="Partidas" value={stats.played} icon={<GamepadIcon size={64} />} />
      </div>
      <div className={s.tile} data-secondary="true">
        <StatTile
          label="Completadas"
          value={stats.completed}
          icon={<Trophy size={64} state="unlocked" />}
        />
      </div>
      <div className={s.tile} data-secondary="true">
        <StatTile
          label="Éxito"
          value={Math.round(stats.successRate * 100)}
          format={(value) => `${String(Math.round(value))}%`}
          icon={<TargetIcon size={64} />}
        />
      </div>
      <div className={s.tile}>
        <StatTile label="Racha" value={stats.currentStreak} icon={<Streak size={64} />} />
      </div>
    </div>
  );
}
