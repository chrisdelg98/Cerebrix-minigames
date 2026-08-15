import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SCHEMA_VERSION } from '@storage/index';

import {
  type AnyGameModule,
  type CellRef,
  type Difficulty,
  type GameStatus,
  type Hint,
} from '../contract';
import { useStorage } from '../storageContext';
import { useAutosave } from './useAutosave';

/**
 * Everything the shell owns during a game: loading the module, holding the
 * state, the undo stack, rejected moves, the clock, autosave and the result.
 *
 * The game owns none of it — see the responsibility table in
 * docs/GAME_CONTRACT.md §5. It only supplies `serialize`/`deserialize`.
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
  /** Time carried over from a resumed session; the clock continues from here. */
  elapsedMs: number;
  /** True when this board came back from storage rather than being generated. */
  resumed: boolean;
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

function roundKey(difficulty: number, seed: string | undefined): string {
  return `${String(difficulty)}:${seed ?? 'first'}`;
}

export function useGameSession(load: GameLoader, initialDifficulty: Difficulty): Session {
  const storage = useStorage();

  const [module, setModule] = useState<AnyGameModule | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);

  /**
   * A fresh seed per round. It is what makes "new game" mean a new board for
   * games that generate one, and it doubles as the identity of the round.
   */
  const [seed, setSeed] = useState<string | undefined>(undefined);
  const round = roundKey(difficulty, seed);

  // The undo stack IS the state: its last entry is the current position. That
  // only works because `applyMove` is contractually pure.
  const [stack, setStack] = useState<OfRound<unknown[]> | null>(null);
  const [lastRejection, setLastRejection] = useState<OfRound<Rejection> | null>(null);
  const [lastHint, setLastHint] = useState<OfRound<Hint | null> | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [resumed, setResumed] = useState(false);

  // Everything below is DERIVED from the current round rather than cleared when
  // it changes: an effect that calls setState synchronously just to reset state
  // buys a cascading render for nothing.
  const history = stack?.round === round ? stack.value : [];
  const rejection = lastRejection?.round === round ? lastRejection.value : null;
  const hint = lastHint?.round === round ? lastHint.value : null;

  // Read inside the board effect without making it depend on the stack — that
  // dependency would restart the board on every move. Synced in an effect
  // declared BEFORE that one, so it is already current when the board effect
  // runs on the same commit.
  const stackRef = useRef(stack);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);

  /** Only the first board of a visit may be restored; later ones are asked for. */
  const bootedRef = useRef(false);
  const startedAtRef = useRef(0);
  const recordedRoundRef = useRef<string | null>(null);

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

  // Resume, or start a new board. `createInitialState` may be async (puzzle
  // JSON, worker), and `deserialize` may reject a state it cannot read.
  useEffect(() => {
    if (!module) return;
    // The board for this exact round already exists — nothing to do. This is
    // what stops the resume below from being immediately overwritten when it
    // adopts the saved difficulty and re-runs this effect.
    if (stackRef.current?.round === round) return;

    let cancelled = false;

    const begin = async (): Promise<void> => {
      if (!bootedRef.current) {
        bootedRef.current = true;

        const saved = await storage.loadSession(module.meta.id);
        if (saved && !cancelled) {
          try {
            const state = module.engine.deserialize(saved.state, saved.stateVersion);
            startedAtRef.current = performance.now();
            setElapsedMs(saved.elapsedMs);
            setResumed(true);
            setDifficulty(saved.difficulty as Difficulty);
            setStack({ round: roundKey(saved.difficulty, undefined), value: [state] });
            return;
          } catch {
            // A save we cannot read is dropped rather than left to fail on
            // every future visit to this game.
            await storage.clearSession(module.meta.id);
          }
        }
      }

      const config = module.engine.getDifficultyConfig(difficulty);
      const initial = await module.engine.createInitialState(config, seed);
      if (cancelled) return;

      startedAtRef.current = performance.now();
      setElapsedMs(0);
      setResumed(false);
      setStack({ round, value: [initial] });
    };

    begin().catch((cause: unknown) => {
      if (!cancelled) setError(toError(cause));
    });

    return () => {
      cancelled = true;
    };
  }, [module, difficulty, seed, round, storage]);

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

  const playing = status.kind === 'playing';

  /** Wall-clock elapsed right now, which is what a save has to record. */
  const currentElapsed = useCallback(
    () => elapsedMs + (playing ? performance.now() - startedAtRef.current : 0),
    [elapsedMs, playing]
  );

  useAutosave({
    enabled: ready && playing && module !== null,
    trigger: state,
    save: () => {
      if (!module || state === undefined) return;
      void storage.saveSession(module.meta.id, {
        schemaVersion: SCHEMA_VERSION,
        gameId: module.meta.id,
        stateVersion: module.meta.stateVersion,
        difficulty,
        state: module.engine.serialize(state),
        elapsedMs: currentElapsed(),
        savedAt: Date.now(),
      });
    },
  });

  // A finished game is recorded once and its autosave dropped: there is nothing
  // left to continue.
  useEffect(() => {
    if (!module || !ready || playing) return;
    if (recordedRoundRef.current === round) return;
    recordedRoundRef.current = round;

    void storage.recordResult(module.meta.id, {
      schemaVersion: SCHEMA_VERSION,
      gameId: module.meta.id,
      difficulty,
      outcome: status.kind === 'won' ? 'won' : 'lost',
      elapsedMs: currentElapsed(),
      finishedAt: Date.now(),
    });
    void storage.clearSession(module.meta.id);
  }, [module, ready, playing, status.kind, round, difficulty, storage, currentElapsed]);

  const dispatch = useCallback(
    (move: unknown) => {
      if (!module || state === undefined || !playing) return;

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
    [module, state, playing, round]
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
    canUndo: history.length > 1 && playing,
    canHint: typeof module?.engine.getHint === 'function' && playing,
    roundId: round,
    elapsedMs,
    resumed,
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
