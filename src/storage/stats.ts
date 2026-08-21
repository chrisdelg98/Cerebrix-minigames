import { type GameResult, type GameStats, type GlobalStats } from './types';

/**
 * Statistics are DERIVED from the results log, never stored alongside it.
 *
 * Keeping a running aggregate next to the log means two sources of truth that
 * drift the first time a write half-fails, and there is no way to tell which
 * one is right afterwards. Recomputing is cheap at this volume; if the log ever
 * grows past the point where it is not, the fix is to compact old results, not
 * to duplicate the totals.
 *
 * Pure functions, no I/O — they are the easiest part of this layer to get wrong
 * and the easiest to test.
 */

/**
 * "Streak" here means consecutive WINS, broken by a loss — not days played.
 * It is the reading that fits the rest of the list (games, completed, success
 * rate) and the one the flame sprite stops for when it hits zero.
 *
 * Un empate NO la corta, pero tampoco la extiende: la deja como está.
 *
 * No es indulgencia. El tres en línea está resuelto —con juego perfecto de los
 * dos lados el resultado es siempre empate—, así que en los niveles altos
 * empatar es el resultado normal de jugar bien. Si cortara la racha, el nivel
 * más difícil sería el único que nunca podés sostener, que es al revés de lo
 * que la racha quiere premiar.
 */
function streaks(ordered: readonly GameResult[]): { current: number; best: number } {
  let best = 0;
  let run = 0;

  for (const result of ordered) {
    if (result.outcome === 'draw') continue;
    run = result.outcome === 'won' ? run + 1 : 0;
    if (run > best) best = run;
  }

  // `ordered` is oldest-first, so the final run IS the current streak.
  return { current: run, best };
}

function byFinishedAt(a: GameResult, b: GameResult): number {
  return a.finishedAt - b.finishedAt;
}

export function computeStats(gameId: string, results: readonly GameResult[]): GameStats {
  const mine = results.filter((result) => result.gameId === gameId).sort(byFinishedAt);
  const completed = mine.filter((result) => result.outcome === 'won');

  const bestMsByDifficulty: Record<number, number> = {};
  for (const result of completed) {
    const previous = bestMsByDifficulty[result.difficulty];
    if (previous === undefined || result.elapsedMs < previous) {
      bestMsByDifficulty[result.difficulty] = result.elapsedMs;
    }
  }

  const { current, best } = streaks(mine);

  return {
    gameId,
    played: mine.length,
    completed: completed.length,
    successRate: mine.length === 0 ? 0 : completed.length / mine.length,
    totalMs: mine.reduce((total, result) => total + result.elapsedMs, 0),
    bestMsByDifficulty,
    currentStreak: current,
    bestStreak: best,
    lastPlayedAt: mine.at(-1)?.finishedAt ?? null,
  };
}

export function computeGlobalStats(results: readonly GameResult[]): GlobalStats {
  const ordered = [...results].sort(byFinishedAt);
  const completed = ordered.filter((result) => result.outcome === 'won');
  const { current, best } = streaks(ordered);

  const byGame: Record<string, GameStats> = {};
  for (const gameId of new Set(ordered.map((result) => result.gameId))) {
    byGame[gameId] = computeStats(gameId, ordered);
  }

  return {
    played: ordered.length,
    completed: completed.length,
    successRate: ordered.length === 0 ? 0 : completed.length / ordered.length,
    totalMs: ordered.reduce((total, result) => total + result.elapsedMs, 0),
    currentStreak: current,
    bestStreak: best,
    byGame,
  };
}
