import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type AnyGameModule,
  type CellRef,
  type Difficulty,
  type GameStatus,
  type Hint,
} from '../contract';

/**
 * Everything the shell owns during a game: loading the module, holding the
 * state, the undo stack, rejected moves and the terminal status.
 *
 * The game owns none of it — see the responsibility table in
 * docs/GAME_CONTRACT.md §5. Autosave and resume plug in here in Phase 3.
 */

export type GameLoader = () => Promise<{ default: AnyGameModule }>;

export type SessionPhase = 'loading' | 'ready' | 'error';

/** A rejected move, kept just long enough for the view to shake and highlight. */
export interface Rejection {
  reason: string;
  cells: CellRef[];
  /** Fresh on every rejection, so repeating the same illegal move re-triggers. */
  nonce: number;
}

export interface Session {
  phase: SessionPhase;
  error: Error | null;
  module: AnyGameModule | null;
  state: unknown;
  status: GameStatus;
  progress: number;
  difficulty: Difficulty;
  hint: Hint | null;
  rejection: Rejection | null;
  canUndo: boolean;
  canHint: boolean;
  /** Identifies the current board. The shell keys the timer off it. */
  roundId: string;
  dispatch: (move: unknown) => void;
  undo: () => void;
  restart: () => void;
  requestHint: () => void;
  setDifficulty: (difficulty: Difficulty) => void;
}

const PLAYING: GameStatus = { kind: 'playing' };

/** Anything tied to one board carries its round, so a stale one is ignored. */
interface OfRound<T> {
  round: string;
  value: T;
}

export function useGameSession(load: GameLoader, initialDifficulty: Difficulty): Session {
  const [module, setModule] = useState<AnyGameModule | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);

  /**
   * A fresh seed per round. It is what makes "new game" mean a new board for
   * games that generate one, and it doubles as the identity of the round.
   */
  const [seed, setSeed] = useState<string | undefined>(undefined);
  const round = `${difficulty}:${seed ?? 'first'}`;

  // The undo stack IS the state: its last entry is the current position. That
  // only works because `applyMove` is contractually pure.
  const [stack, setStack] = useState<OfRound<unknown[]> | null>(null);
  const [lastRejection, setLastRejection] = useState<OfRound<Rejection> | null>(null);
  const [lastHint, setLastHint] = useState<OfRound<Hint | null> | null>(null);

  // Everything below is DERIVED from the current round rather than cleared when
  // it changes: an effect that calls setState synchronously just to reset state
  // buys a cascading render for nothing.
  const history = stack?.round === round ? stack.value : [];
  const rejection = lastRejection?.round === round ? lastRejection.value : null;
  const hint = lastHint?.round === round ? lastHint.value : null;

  useEffect(() => {
    let cancelled = false;

    load()
      .then((loaded) => {
        if (!cancelled) setModule(loaded.default);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(toError(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [load]);

  // A new board whenever the module arrives, the difficulty changes, or the
  // player restarts. `createInitialState` may be async (puzzle JSON, worker).
  useEffect(() => {
    if (!module) return;

    let cancelled = false;
    const config = module.engine.getDifficultyConfig(difficulty);

    Promise.resolve(module.engine.createInitialState(config, seed))
      .then((initial) => {
        if (!cancelled) setStack({ round, value: [initial] });
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(toError(cause));
      });

    return () => {
      cancelled = true;
    };
  }, [module, difficulty, seed, round]);

  const state = history.length > 0 ? history[history.length - 1] : undefined;
  const ready = module !== null && history.length > 0;

  const status = useMemo<GameStatus>(
    () => (ready && module ? module.engine.checkStatus(state) : PLAYING),
    [ready, module, state]
  );

  const progress = useMemo(
    () => (ready && module ? clamp01(module.engine.getProgress(state)) : 0),
    [ready, module, state]
  );

  const dispatch = useCallback(
    (move: unknown) => {
      if (!module || state === undefined || status.kind !== 'playing') return;

      const verdict = module.engine.validate(state, move);
      if (!verdict.ok) {
        setLastRejection({
          round,
          value: { reason: verdict.reason, cells: verdict.cells ?? [], nonce: Date.now() },
        });
        return;
      }

      const next = module.engine.applyMove(state, move);
      setLastRejection(null);
      setLastHint(null);
      setStack((current) =>
        current === null ? current : { round: current.round, value: [...current.value, next] }
      );
    },
    [module, state, status.kind, round]
  );

  const undo = useCallback(() => {
    setStack((current) =>
      current === null || current.value.length <= 1
        ? current
        : { round: current.round, value: current.value.slice(0, -1) }
    );
    setLastRejection(null);
  }, []);

  const restart = useCallback(() => {
    setSeed(freshSeed());
  }, []);

  const requestHint = useCallback(() => {
    if (!module?.engine.getHint || state === undefined) return;
    setLastHint({ round, value: module.engine.getHint(state) });
  }, [module, state, round]);

  const changeDifficulty = useCallback((next: Difficulty) => {
    // Phase 4 adds the "are you sure?" confirmation for changing mid-game.
    setDifficulty(next);
  }, []);

  return {
    phase: error ? 'error' : ready ? 'ready' : 'loading',
    error,
    module,
    state,
    status,
    progress,
    difficulty,
    hint,
    rejection,
    canUndo: history.length > 1 && status.kind === 'playing',
    canHint: typeof module?.engine.getHint === 'function' && status.kind === 'playing',
    roundId: round,
    dispatch,
    undo,
    restart,
    requestHint,
    setDifficulty: changeDifficulty,
  };
}

function freshSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}
