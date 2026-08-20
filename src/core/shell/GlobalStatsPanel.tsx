import { Sparks } from '@design/components/Sparks';
import { StatTile } from '@design/components/StatTile';
import { GamepadIcon, TargetIcon } from '@design/sprites/SettingsIcons';
import { Streak } from '@design/sprites/Streak';
import { Trophy } from '@design/sprites/Trophy';
import { type CSSVars } from '@design/types';
import { type GlobalStats } from '@storage/index';

import { isCrowned, sparkIntensity } from '../streak';

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
  const glow = sparkIntensity(stats.currentStreak);
  const crowned = isCrowned(stats.currentStreak);

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
      {/*
        La llama se enciende con la racha.
        Sin esto, el icono quedaba en teal pálido detrás de chispas doradas —
        dos cosas peleando en el mismo rincón. Encendiéndose, el icono y el
        efecto pasan a ser lo mismo, y la recompensa se lee en la ficha entera y
        no en un adorno pegado encima.
      */}
      <div
        className={s.tile}
        style={
          glow === null
            ? undefined
            : ({
                /*
                 * El tono NO se interpola: desde la primera chispa la llama ya
                 * es dorada, y lo que crece es cuánto se la ve.
                 *
                 * Mezclar el acento con el dorado parecía lo natural y se veía
                 * mal: son casi complementarios, así que la mezcla pasa por un
                 * gris oliva y las rachas del medio quedaban con una llama
                 * sucia. De tenue a encendida se lee como progresión igual, y
                 * sin ningún paso feo.
                 */
                '--stat-icon': 'var(--c-gold)',
                '--stat-icon-opacity': String(0.16 + glow * 0.44),
                // Entra hasta quedar completa: sangrada fuera del borde estaba
                // bien cuando era fondo, no ahora que es lo que se mira.
                '--stat-icon-end': `${String(Math.round(glow * 10))}px`,
              } as CSSVars)
        }
      >
        <StatTile
          label="Racha"
          value={stats.currentStreak}
          icon={<Streak size={64} />}
          // Solo se pide cuando hay algo que festejar, así que el chunk del
          // efecto ni se descarga hasta que la racha llega a siete.
          overlay={glow === null ? undefined : <Sparks intensity={glow} ring={crowned} />}
        />
      </div>
    </div>
  );
}
