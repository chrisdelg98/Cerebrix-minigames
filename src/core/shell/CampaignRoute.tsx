import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@design/components/Badge';
import { Button } from '@design/components/Button';
import { Modal } from '@design/components/Modal';
import { ArrowLeftIcon, PlayIcon } from '@design/sprites/SettingsIcons';
import { Trophy } from '@design/sprites/Trophy';
import { type LossPenalty } from '@storage/types';

import { campaignTier, TIER_LABELS } from '../badges';
import { LEVELS, PRESETS, totalWins, WINS_MAX, WINS_MIN, type CampaignConfig } from '../campaign';
import { type Difficulty } from '../contract';
import { DIFFICULTY_LABELS } from '../difficulty';
import { useCampaign } from '../hooks/useCampaign';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { findEntry, pathFor, REGISTRY } from '../registry';
import { AppShell } from './AppShell';

import s from './CampaignRoute.module.css';

const PLAYABLE = REGISTRY.filter((entry) => entry.id !== '_dummy');

type PoolKind = 'all' | 'logic' | 'arcade' | 'custom';

const POOLS: { id: PoolKind; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'logic', label: 'Solo lógica' },
  { id: 'arcade', label: 'Solo arcade' },
  { id: 'custom', label: 'Elegir' },
];

const PENALTIES: { id: LossPenalty; label: string; hint: string }[] = [
  { id: 'none', label: 'Nada', hint: 'Solo cuentan las victorias.' },
  { id: 'reset', label: 'Reinicia el tramo', hint: 'Perder devuelve el contador a cero.' },
  { id: 'lives', label: 'Vidas', hint: 'Al quedarte sin, se termina la campaña.' },
];

function poolFor(kind: PoolKind, custom: string[]): string[] {
  if (kind === 'custom') return custom;
  if (kind === 'logic')
    return PLAYABLE.filter((e) => e.preview.category === 'lógica').map((e) => e.id);
  if (kind === 'arcade')
    return PLAYABLE.filter((e) => e.preview.category === 'arcade').map((e) => e.id);
  return PLAYABLE.map((e) => e.id);
}

export function CampaignRoute() {
  const { campaign, ready, start, abandon, event, dismissEvent } = useCampaign();
  useDocumentMeta('Campaña', 'Subí de nivel ganando partidas, en un juego o saltando entre todos.');

  const header = (
    <>
      <Link to="/" className={s.back} aria-label="Volver al inicio">
        <ArrowLeftIcon />
      </Link>
      <span className={s.title}>Campaña</span>
      <span />
    </>
  );

  if (!ready) return <AppShell header={header}>{null}</AppShell>;

  /*
   * El final tiene pantalla propia.
   *
   * Sin esto, terminar una campaña te dejaba en el formulario de configuración
   * —que es lo que se muestra cuando no hay campaña activa— y el logro que
   * acababas de ganar no aparecía por ningún lado.
   */
  if (event?.kind === 'completed' || event?.kind === 'failed') {
    return (
      <AppShell header={header}>
        <Result kind={event.kind} onClose={dismissEvent} />
      </AppShell>
    );
  }

  return (
    <AppShell header={header}>
      {campaign === null ? <Setup onStart={start} /> : <Status onAbandon={abandon} />}
    </AppShell>
  );
}

function Result({ kind, onClose }: { kind: 'completed' | 'failed'; onClose: () => void }) {
  const ganada = kind === 'completed';

  return (
    <div className={`${s.status} anim-slide-up`}>
      {ganada && <Trophy size={96} state="unlocked" />}

      <p className={s.level}>{ganada ? '¡Campaña completada!' : 'Se acabó'}</p>

      <p className={s.hint}>
        {ganada
          ? 'Llegaste al final de Experto. El logro te espera en tu historial.'
          : 'Te quedaste sin vidas. La campaña se cierra acá.'}
      </p>

      <div className={s.actions}>
        {ganada && (
          <Link to="/historial" className={s.resultLink}>
            Ver mis logros
          </Link>
        )}
        <Button variant="primary" size="lg" block onClick={onClose}>
          Empezar otra campaña
        </Button>
      </div>
    </div>
  );
}

function Setup({ onStart }: { onStart: (config: CampaignConfig) => Promise<void> }) {
  const [preset, setPreset] = useState('classic');
  const base = PRESETS.find((one) => one.id === preset) ?? PRESETS[1];

  const [wins, setWins] = useState(base?.config.winsPerLevel ?? 2);
  const [level, setLevel] = useState<Difficulty>(base?.config.startLevel ?? 1);
  const [onLoss, setOnLoss] = useState<LossPenalty>(base?.config.onLoss ?? 'reset');
  const [lives, setLives] = useState(base?.config.lives ?? 3);
  const [refill, setRefill] = useState(base?.config.refillLives ?? true);
  const [poolKind, setPoolKind] = useState<PoolKind>('all');
  const [custom, setCustom] = useState<string[]>(PLAYABLE.slice(0, 4).map((e) => e.id));

  const applyPreset = (id: string) => {
    const found = PRESETS.find((one) => one.id === id);
    if (found === undefined) return;
    setPreset(id);
    setWins(found.config.winsPerLevel);
    setLevel(found.config.startLevel);
    setOnLoss(found.config.onLoss);
    setLives(found.config.lives);
    setRefill(found.config.refillLives);
  };

  const config = useMemo<CampaignConfig>(
    () => ({
      winsPerLevel: wins,
      startLevel: level,
      pool: poolFor(poolKind, custom),
      onLoss,
      lives,
      refillLives: refill,
    }),
    [wins, level, poolKind, custom, onLoss, lives, refill]
  );

  const tier = campaignTier(config);
  const rondas = totalWins(config);
  const vacío = config.pool.length === 0;

  /*
   * Un aviso honesto, no un adorno: la mitad del estante NO SE PUEDE PERDER
   * —Sudoku, Shikaku, Nonograma, Lights Out, Trazo, Tango, Queens— así que un
   * castigo duro con un conjunto solo de lógica no hace absolutamente nada.
   */
  const soloLógica = config.pool.every((id) => findEntry(id)?.preview.category === 'lógica');
  const castigoInerte = onLoss !== 'none' && soloLógica && config.pool.length > 0;

  return (
    <div className={`${s.setup} anim-slide-up`}>
      <section className={s.block}>
        <h2 className={s.legend}>Cómo de exigente</h2>
        <div className={s.row}>
          {PRESETS.map((one) => (
            <Button
              key={one.id}
              variant={one.id === preset ? 'primary' : 'ghost'}
              aria-pressed={one.id === preset}
              onClick={() => {
                applyPreset(one.id);
              }}
            >
              {one.name}
            </Button>
          ))}
        </div>
        <p className={s.hint}>{PRESETS.find((one) => one.id === preset)?.hint}</p>
      </section>

      <section className={s.block}>
        <h2 className={s.legend}>Victorias por nivel</h2>
        <div className={s.row}>
          {Array.from({ length: WINS_MAX - WINS_MIN + 1 }, (_, i) => i + WINS_MIN).map((n) => (
            <Button
              key={n}
              variant={n === wins ? 'primary' : 'ghost'}
              aria-pressed={n === wins}
              onClick={() => {
                setWins(n);
              }}
            >
              {n}
            </Button>
          ))}
        </div>
      </section>

      <section className={s.block}>
        <h2 className={s.legend}>Empezar en</h2>
        <div className={s.row}>
          {([1, 2, 3, 4, 5] as Difficulty[]).map((one) => (
            <Button
              key={one}
              variant={one === level ? 'primary' : 'ghost'}
              aria-pressed={one === level}
              onClick={() => {
                setLevel(one);
              }}
            >
              {DIFFICULTY_LABELS[one]}
            </Button>
          ))}
        </div>
      </section>

      <section className={s.block}>
        <h2 className={s.legend}>Al perder</h2>
        <div className={s.row}>
          {PENALTIES.map((one) => (
            <Button
              key={one.id}
              variant={one.id === onLoss ? 'primary' : 'ghost'}
              aria-pressed={one.id === onLoss}
              onClick={() => {
                setOnLoss(one.id);
              }}
            >
              {one.label}
            </Button>
          ))}
        </div>
        <p className={s.hint}>{PENALTIES.find((one) => one.id === onLoss)?.hint}</p>

        {onLoss === 'lives' && (
          <div className={s.row}>
            {[1, 2, 3, 5].map((n) => (
              <Button
                key={n}
                variant={n === lives ? 'primary' : 'ghost'}
                aria-pressed={n === lives}
                onClick={() => {
                  setLives(n);
                }}
              >
                {n === 1 ? '1 vida' : `${String(n)} vidas`}
              </Button>
            ))}
            <Button
              variant={refill ? 'primary' : 'ghost'}
              aria-pressed={refill}
              onClick={() => {
                setRefill(!refill);
              }}
            >
              Reponer al subir
            </Button>
          </div>
        )}

        {castigoInerte && (
          <p className={s.warning} role="status">
            Con solo juegos de lógica este castigo no hace nada: esos juegos no se pueden perder.
          </p>
        )}
      </section>

      <section className={s.block}>
        <h2 className={s.legend}>Qué juegos</h2>
        <div className={s.row}>
          {POOLS.map((one) => (
            <Button
              key={one.id}
              variant={one.id === poolKind ? 'primary' : 'ghost'}
              aria-pressed={one.id === poolKind}
              onClick={() => {
                setPoolKind(one.id);
              }}
            >
              {one.label}
            </Button>
          ))}
        </div>

        {poolKind === 'custom' && (
          <div className={s.games}>
            {PLAYABLE.map((entry) => {
              const on = custom.includes(entry.id);
              return (
                <Button
                  key={entry.id}
                  variant={on ? 'accent' : 'ghost'}
                  aria-pressed={on}
                  onClick={() => {
                    setCustom((list) =>
                      on ? list.filter((id) => id !== entry.id) : [...list, entry.id]
                    );
                  }}
                >
                  {entry.preview.name}
                </Button>
              );
            })}
          </div>
        )}

        <p className={s.hint}>
          {config.pool.length === 1
            ? 'Un solo juego: la campaña se queda ahí y solo sube de nivel.'
            : `${String(config.pool.length)} juegos, uno por ronda y sin repetir hasta que pasen todos.`}
        </p>
      </section>

      <section className={s.summary}>
        <p className={s.summaryLine}>
          <strong>{rondas}</strong> victorias para terminar
        </p>
        <Badge tone={tier === 'gold' ? 'gold' : tier === 'silver' ? 'accent' : 'neutral'}>
          Logro {TIER_LABELS[tier]}
        </Badge>
      </section>

      <Button
        variant="primary"
        size="lg"
        block
        icon={<PlayIcon size={20} />}
        disabled={vacío}
        onClick={() => {
          void onStart(config);
        }}
      >
        {vacío ? 'Elegí al menos un juego' : 'Empezar campaña'}
      </Button>
    </div>
  );
}

function Status({ onAbandon }: { onAbandon: () => Promise<void> }) {
  const { campaign, event } = useCampaign();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  if (campaign === null) return null;

  const entry = findEntry(campaign.current);
  const Icon = entry?.icon;
  const { winsPerLevel, onLoss } = campaign.config;
  const últimaVida = onLoss === 'lives' && campaign.livesLeft === 1;

  return (
    <div className={`${s.status} anim-slide-up`}>
      {/*
        Los cinco niveles como barras que suben, el mismo lenguaje que la tarjeta
        de la portada. Dice DÓNDE estás en la campaña entera, que es lo que el
        nombre del nivel solo no cuenta.
      */}
      <div
        className={s.ladder}
        role="img"
        aria-label={`Nivel ${String(campaign.level)} de 5: ${DIFFICULTY_LABELS[campaign.level]}`}
      >
        {LEVELS.map((one) => (
          <span
            key={one}
            className={s.step}
            data-state={one < campaign.level ? 'done' : one === campaign.level ? 'now' : 'todo'}
          />
        ))}
      </div>

      <p className={s.level}>{DIFFICULTY_LABELS[campaign.level]}</p>

      {/* El momento de subir merece decirse: si no, el nivel cambia de nombre y
          nada más. */}
      {event?.kind === 'level-up' && (
        <p className={s.levelUp} role="status">
          ¡Subiste de nivel!
        </p>
      )}

      <div className={s.card}>
        <span className={s.cardLabel}>Ahora te toca</span>

        <span className={s.game}>
          {Icon !== undefined && (
            <span className={s.icon} aria-hidden="true">
              <Icon size={44} />
            </span>
          )}
          <span className={s.gameName}>{entry?.preview.name ?? campaign.current}</span>
        </span>

        {/* El tramo, en puntos Y en número: los puntos se cuentan de un vistazo
            y el número no deja lugar a dudas cuando son cinco. */}
        <span
          className={s.tramo}
          role="img"
          aria-label={`${String(campaign.wins)} de ${String(winsPerLevel)} victorias en este nivel`}
        >
          <span className={s.pips} aria-hidden="true">
            {Array.from({ length: winsPerLevel }, (_, i) => (
              <span key={i} className={s.pip} data-on={i < campaign.wins} />
            ))}
          </span>
          <span className={s.tramoText} aria-hidden="true">
            <span className="tabular">{campaign.wins}</span> de{' '}
            <span className="tabular">{winsPerLevel}</span>
          </span>
        </span>
      </div>

      {onLoss === 'lives' && (
        <p className={s.lives} data-critical={últimaVida}>
          {últimaVida ? 'Última vida' : `${String(campaign.livesLeft)} vidas`}
        </p>
      )}

      {/* Agrupados y los dos `lg`, como el portal de cada juego: dos acciones
          apiladas tienen que medir lo mismo y estar cerca. */}
      <div className={s.actions}>
        <Button
          variant="primary"
          size="lg"
          block
          icon={<PlayIcon size={20} />}
          onClick={() => {
            if (entry) void navigate(pathFor(entry));
          }}
        >
          Jugar
        </Button>

        <Button
          size="lg"
          block
          onClick={() => {
            setConfirming(true);
          }}
        >
          Abandonar campaña
        </Button>
      </div>

      <Modal
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title="¿Abandonar la campaña?"
        actions={
          <>
            <Button
              onClick={() => {
                setConfirming(false);
              }}
            >
              Seguir jugando
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                void onAbandon();
                setConfirming(false);
              }}
            >
              Abandonar
            </Button>
          </>
        }
      >
        <span>Se pierde el progreso y no se puede recuperar.</span>
      </Modal>
    </div>
  );
}
