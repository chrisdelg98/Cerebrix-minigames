import { describe, expect, it } from 'vitest';

import {
  afterRound,
  drawFrom,
  startCampaign,
  totalWins,
  type CampaignConfig,
} from '@core/campaign';
import { campaignTier, demandScore } from '@core/badges';

const POOL = ['sudoku', 'snake', 'shikaku', 'tango'];

function config(over: Partial<CampaignConfig> = {}): CampaignConfig {
  return {
    winsPerLevel: 2,
    startLevel: 1,
    pool: POOL,
    onLoss: 'none',
    lives: 3,
    refillLives: true,
    ...over,
  };
}

/** Un azar predecible, para que la bolsa se pueda afirmar. */
function fixedRandom(): () => number {
  let i = 0;
  const values = [0.1, 0.9, 0.4, 0.7, 0.2, 0.6, 0.3, 0.8];
  return () => values[i++ % values.length] as number;
}

describe('la bolsa', () => {
  /*
   * Sin reponer: todos pasan una vez antes de que se repita ninguno. Es lo que
   * separa esto de tirar un dado, que repite y se siente injusto.
   */
  it('reparte todo el conjunto antes de repetir', () => {
    let bag: string[] = [];
    const salidos: string[] = [];
    const random = fixedRandom();

    for (let i = 0; i < POOL.length; i += 1) {
      const draw = drawFrom(bag, POOL, 1, random);
      salidos.push(draw.id);
      bag = draw.bag;
    }

    expect(new Set(salidos).size, `se repitió alguno: ${salidos.join(', ')}`).toBe(POOL.length);
    expect(bag).toHaveLength(0);
  });

  it('y después rearma sola', () => {
    const random = fixedRandom();
    const vacía = drawFrom([], POOL, 1, random);
    expect(vacía.bag).toHaveLength(POOL.length - 1);
  });

  it('respeta qué juegos ofrecen ese nivel', () => {
    // Solo sudoku llega a Experto en este escenario.
    const supports = (id: string, level: number) => level < 5 || id === 'sudoku';
    const draw = drawFrom([], POOL, 5, () => 0.5, supports);

    expect(draw.id).toBe('sudoku');
  });

  /* Quedarse sin ronda sería peor que jugar una a otro nivel. */
  it('si ninguno ofrece el nivel, igual reparte', () => {
    const draw = drawFrom(
      [],
      POOL,
      5,
      () => 0.5,
      () => false
    );
    expect(POOL).toContain(draw.id);
  });
});

describe('avanzar', () => {
  it('hacen falta N victorias para subir', () => {
    let campaign = startCampaign(config({ winsPerLevel: 2 }), fixedRandom());
    expect(campaign.level).toBe(1);

    const primera = afterRound(campaign, 'won', fixedRandom());
    expect(primera.event.kind).toBe('continue');
    expect(primera.campaign?.wins).toBe(1);
    expect(primera.campaign?.level).toBe(1);

    campaign = primera.campaign as typeof campaign;
    const segunda = afterRound(campaign, 'won', fixedRandom());
    expect(segunda.event).toEqual({ kind: 'level-up', level: 2 });
    expect(segunda.campaign?.wins, 'el contador no volvió a cero').toBe(0);
  });

  it('ganar el último tramo de Experto completa la campaña', () => {
    const campaign = {
      ...startCampaign(config({ winsPerLevel: 1, startLevel: 5 }), fixedRandom()),
    };
    const fin = afterRound(campaign, 'won', fixedRandom());

    expect(fin.event.kind).toBe('completed');
    expect(fin.campaign, 'la campaña siguió después de terminar').toBeNull();
  });

  /* Coherente con la racha, donde un empate tampoco corta. */
  it('el empate ni suma ni castiga', () => {
    const campaign = startCampaign(config({ onLoss: 'reset' }), fixedRandom());
    const conUna = afterRound(campaign, 'won', fixedRandom()).campaign as typeof campaign;

    const empate = afterRound(conUna, 'draw', fixedRandom());
    expect(empate.event.kind).toBe('continue');
    expect(empate.campaign?.wins).toBe(1);
  });

  it('cambia de juego en cada ronda', () => {
    const campaign = startCampaign(config(), fixedRandom());
    const siguiente = afterRound(campaign, 'won', fixedRandom()).campaign;

    expect(siguiente?.current).not.toBe(campaign.current);
  });

  /* Con un solo juego, la campaña se queda en ese: es el "modo un juego" sin
     necesidad de un modo aparte. */
  it('con un conjunto de uno, no se mueve', () => {
    const campaign = startCampaign(config({ pool: ['shikaku'] }), fixedRandom());
    const siguiente = afterRound(campaign, 'won', fixedRandom()).campaign;

    expect(campaign.current).toBe('shikaku');
    expect(siguiente?.current).toBe('shikaku');
  });
});

describe('los castigos', () => {
  it('sin castigo, perder no mueve nada', () => {
    const campaign = startCampaign(config({ onLoss: 'none' }), fixedRandom());
    const conUna = afterRound(campaign, 'won', fixedRandom()).campaign as typeof campaign;
    const perdida = afterRound(conUna, 'lost', fixedRandom());

    expect(perdida.event.kind).toBe('continue');
    expect(perdida.campaign?.wins).toBe(1);
  });

  it('con reinicio, perder vuelve el tramo a cero pero no baja de nivel', () => {
    const campaign = startCampaign(config({ onLoss: 'reset' }), fixedRandom());
    const conUna = afterRound(campaign, 'won', fixedRandom()).campaign as typeof campaign;
    const perdida = afterRound(conUna, 'lost', fixedRandom());

    expect(perdida.event.kind).toBe('level-reset');
    expect(perdida.campaign?.wins).toBe(0);
    expect(perdida.campaign?.level, 'bajó de nivel, y no debería').toBe(1);
  });

  it('con vidas, la última perdida termina la campaña', () => {
    let campaign = startCampaign(
      config({ onLoss: 'lives', lives: 2, refillLives: false }),
      fixedRandom()
    );

    const primera = afterRound(campaign, 'lost', fixedRandom());
    expect(primera.campaign?.livesLeft).toBe(1);

    campaign = primera.campaign as typeof campaign;
    const segunda = afterRound(campaign, 'lost', fixedRandom());
    expect(segunda.event.kind).toBe('failed');
    expect(segunda.campaign).toBeNull();
  });

  it('y las vidas se reponen al subir solo si está configurado', () => {
    const base = config({ onLoss: 'lives', lives: 3, winsPerLevel: 1 });

    const conRepuesto = afterRound(
      { ...startCampaign({ ...base, refillLives: true }, fixedRandom()), livesLeft: 1 },
      'won',
      fixedRandom()
    );
    expect(conRepuesto.campaign?.livesLeft).toBe(3);

    const sinRepuesto = afterRound(
      { ...startCampaign({ ...base, refillLives: false }, fixedRandom()), livesLeft: 1 },
      'won',
      fixedRandom()
    );
    expect(sinRepuesto.campaign?.livesLeft, 'repuso vidas sin que se lo pidieran').toBe(1);
  });
});

describe('el logro', () => {
  /*
   * El nivel del logro mide la CONFIGURACIÓN, no qué preset se tocó: un ajuste a
   * mano tan duro como el hardcore se lleva el mismo oro.
   */
  it('la campaña más exigente da oro', () => {
    const duro = config({
      winsPerLevel: 5,
      onLoss: 'lives',
      lives: 1,
      refillLives: false,
      startLevel: 1,
      pool: Array.from({ length: 12 }, (_, i) => `g${String(i)}`),
    });

    expect(campaignTier(duro)).toBe('gold');
  });

  it('la más suave da bronce', () => {
    const suave = config({ winsPerLevel: 1, onLoss: 'none', startLevel: 5, pool: ['sudoku'] });
    expect(campaignTier(suave)).toBe('bronze');
  });

  it('y la exigencia sube con cada tornillo', () => {
    const base = config({ winsPerLevel: 1, onLoss: 'none', startLevel: 5, pool: ['sudoku'] });

    expect(demandScore({ ...base, winsPerLevel: 3 })).toBeGreaterThan(demandScore(base));
    expect(demandScore({ ...base, onLoss: 'reset' })).toBeGreaterThan(demandScore(base));
    expect(demandScore({ ...base, onLoss: 'lives', lives: 1, refillLives: false })).toBeGreaterThan(
      demandScore({ ...base, onLoss: 'reset' })
    );
    expect(demandScore({ ...base, startLevel: 1 })).toBeGreaterThan(demandScore(base));
  });
});

describe('cuánto dura', () => {
  it('las victorias que hacen falta salen del arranque y de N', () => {
    expect(totalWins(config({ startLevel: 1, winsPerLevel: 2 }))).toBe(10);
    expect(totalWins(config({ startLevel: 3, winsPerLevel: 2 }))).toBe(6);
    expect(totalWins(config({ startLevel: 1, winsPerLevel: 5 }))).toBe(25);
  });
});
