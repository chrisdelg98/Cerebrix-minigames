import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { SCHEMA_VERSION, type CampaignRecord } from '@storage/types';

import { CAMPAIGN_BADGE, campaignTier } from '../badges';
import {
  afterRound,
  startCampaign,
  type Campaign,
  type CampaignConfig,
  type CampaignEvent,
  type RoundOutcome,
} from '../campaign';
import { type Difficulty } from '../contract';
import { findEntry } from '../registry';
import { useStorage } from '../storageContext';

/**
 * Un juego ofrece un nivel si lo declara.
 *
 * Hoy los dieciséis declaran los cinco, pero el contrato permite menos y una
 * campaña no puede lanzar a alguien a un nivel que su juego no tiene.
 */
function supports(gameId: string, level: Difficulty): boolean {
  const entry = findEntry(gameId);
  return entry?.preview.difficulties.includes(level) ?? false;
}

function toRecord(campaign: Campaign): CampaignRecord {
  return {
    schemaVersion: SCHEMA_VERSION,
    winsPerLevel: campaign.config.winsPerLevel,
    startLevel: campaign.config.startLevel,
    pool: campaign.config.pool,
    onLoss: campaign.config.onLoss,
    lives: campaign.config.lives,
    refillLives: campaign.config.refillLives,
    level: campaign.level,
    wins: campaign.wins,
    livesLeft: campaign.livesLeft,
    bag: campaign.bag,
    current: campaign.current,
    startedAt: campaign.startedAt,
  };
}

function fromRecord(record: CampaignRecord): Campaign {
  return {
    config: {
      winsPerLevel: record.winsPerLevel,
      startLevel: record.startLevel as Difficulty,
      pool: record.pool,
      onLoss: record.onLoss,
      lives: record.lives,
      refillLives: record.refillLives,
    },
    level: record.level as Difficulty,
    wins: record.wins,
    livesLeft: record.livesLeft,
    bag: record.bag,
    current: record.current,
    startedAt: record.startedAt,
  };
}

export interface CampaignApi {
  campaign: Campaign | null;
  ready: boolean;
  /** Lo último que pasó, para la pantalla entre rondas. */
  event: CampaignEvent | null;
  start: (config: CampaignConfig) => Promise<void>;
  report: (outcome: RoundOutcome) => Promise<void>;
  abandon: () => Promise<void>;
  dismissEvent: () => void;
}

export const CampaignContext = createContext<CampaignApi | null>(null);

/**
 * La campaña vive en el shell y ningún juego la conoce.
 *
 * El shell ya sabe cuándo alguien gana; lo único nuevo es que después de ganar
 * decida qué lanzar. Por eso esto no toca el contrato ni ningún módulo de
 * `/games`.
 */
export function useCampaignState(): CampaignApi {
  const storage = useStorage();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [ready, setReady] = useState(false);
  const [event, setEvent] = useState<CampaignEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    void storage.loadCampaign().then((record) => {
      if (cancelled) return;
      setCampaign(record === null ? null : fromRecord(record));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [storage]);

  const start = useCallback(
    async (config: CampaignConfig) => {
      const fresh = startCampaign(config, Math.random, supports);
      setCampaign(fresh);
      setEvent(null);
      await storage.saveCampaign(toRecord(fresh));
    },
    [storage]
  );

  const report = useCallback(
    async (outcome: RoundOutcome) => {
      if (campaign === null) return;
      const result = afterRound(campaign, outcome, Math.random, supports);

      setCampaign(result.campaign);
      setEvent(result.event);

      if (result.campaign === null) {
        await storage.clearCampaign();
        /* El logro solo se graba al COMPLETAR. Quedarse sin vidas termina la
           campaña igual, pero no es lo mismo. */
        if (result.event.kind === 'completed') {
          await storage.awardBadge({
            schemaVersion: SCHEMA_VERSION,
            id: CAMPAIGN_BADGE,
            earnedAt: Date.now(),
            detail: JSON.stringify({
              tier: campaignTier(campaign.config),
              winsPerLevel: campaign.config.winsPerLevel,
              startLevel: campaign.config.startLevel,
              onLoss: campaign.config.onLoss,
              games: campaign.config.pool.length,
            }),
          });
        }
        return;
      }

      await storage.saveCampaign(toRecord(result.campaign));
    },
    [campaign, storage]
  );

  const abandon = useCallback(async () => {
    setCampaign(null);
    setEvent(null);
    await storage.clearCampaign();
  }, [storage]);

  const dismissEvent = useCallback(() => {
    setEvent(null);
  }, []);

  return { campaign, ready, event, start, report, abandon, dismissEvent };
}

export function useCampaign(): CampaignApi {
  const api = useContext(CampaignContext);
  if (api === null) {
    throw new Error('useCampaign fuera de <CampaignProvider>');
  }
  return api;
}
