import { type ComponentType } from 'react';

/**
 * The game contract — docs/GAME_CONTRACT.md.
 *
 * The shell knows this file. It never knows a game. If a game needs the shell
 * to change, the contract is wrong: fix the contract, do not patch the shell.
 */

/* ─────────────────────────── Difficulty ─────────────────────────── */

export type Difficulty = 1 | 2 | 3 | 4 | 5;

/* ─────────────────────────── Metadata ─────────────────────────── */

export type GameTag = 'lógica' | 'memoria' | 'cálculo' | 'azar' | 'velocidad';

export interface GameMeta {
  /** Stable identifier. It lives in the URL and in the database: never change it. */
  id: string;
  name: string;
  /** One line for the Home card. */
  tagline: string;
  /** The game's sprite. A component, not a file path. */
  icon: ComponentType<{ size?: number }>;
  /** Only the difficulties this game actually implements. */
  difficulties: Difficulty[];
  /** For filtering and grouping on Home. */
  tags: GameTag[];
  estimatedMinutes: [min: number, max: number];
  /** Shape version of TState. Bump it whenever the saved shape changes. */
  stateVersion: number;
}

/* ─────────────────────────── Engine (pure logic) ─────────────────────────── */

export interface CellRef {
  row: number;
  col: number;
}

export type ValidationResult = { ok: true } | { ok: false; reason: string; cells?: CellRef[] };

export type GameStatus =
  { kind: 'playing' } | { kind: 'won'; score?: number } | { kind: 'lost'; reason?: string };

export interface Hint {
  cells: CellRef[];
  message: string;
}

/**
 * TState  — the complete, serializable state of a game in progress.
 * TMove   — a player action (place a digit, flag a cell, move a card…).
 * TConfig — the internal configuration the game derives from a difficulty.
 *
 * Nothing here may import React, CSS or /design: the engine has to be testable
 * without a DOM and runnable inside a Web Worker.
 */
export interface GameEngine<TState, TMove, TConfig = unknown> {
  /** Translates the shared 1–5 scale into this game's own configuration. */
  getDifficultyConfig(difficulty: Difficulty): TConfig;

  /**
   * Starts a new game. `seed` makes a board reproducible (daily puzzle, shared
   * board). May be async: loading a puzzle JSON, or asking a worker for one.
   */
  createInitialState(config: TConfig, seed?: string): TState | Promise<TState>;

  /** Is this move legal in this state? Never mutates. */
  validate(state: TState, move: TMove): ValidationResult;

  /**
   * Applies the move. MUST be pure: returns a new state, never mutates the one
   * it received. The shell relies on that for undo/redo and for React diffing.
   */
  applyMove(state: TState, move: TMove): TState;

  /** Terminal state of the game. */
  checkStatus(state: TState): GameStatus;

  /** How far along, from 0 to 1. Feeds the shell's progress bar. */
  getProgress(state: TState): number;

  /** Optional. Its presence is what enables the shell's hint button. */
  getHint?(state: TState): Hint | null;

  /** State → JSON. Stored verbatim. */
  serialize(state: TState): string;

  /** JSON → state. Receives the version it was saved with, so it can migrate. */
  deserialize(raw: string, fromVersion: number): TState;
}

/* ─────────────────────────── View ─────────────────────────── */

/** What the shell hands to a game's view. */
export interface GameViewProps<TState, TMove> {
  state: TState;
  /**
   * The only input channel. The view NEVER mutates state on its own.
   * A property rather than a method so views can destructure it safely.
   */
  dispatch: (move: TMove) => void;
  status: GameStatus;
  difficulty: Difficulty;
  /** Lets the view lock interaction during animations or once the game is over. */
  interactive: boolean;
  /** The active hint, if the player asked for one. */
  hint: Hint | null;
}

/* ─────────────────────────── Footer actions ─────────────────────────── */

export interface GameAction<TMove> {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** The move to dispatch, or null if it only flips view-local state. */
  toMove?: () => TMove | null;
  /** If it is a toggle, the shell draws the active state. */
  toggle?: boolean;
}

/* ─────────────────────────── The module ─────────────────────────── */

export interface GameModule<TState = unknown, TMove = unknown, TConfig = unknown> {
  meta: GameMeta;
  engine: GameEngine<TState, TMove, TConfig>;
  View: ComponentType<GameViewProps<TState, TMove>>;
  /** Extra footer actions specific to this game (Sudoku's pencil mode, say). */
  actions?: GameAction<TMove>[];
}

/**
 * A module the shell holds without being able to name its types.
 *
 * The shell is deliberately blind here: it receives a state from `createInitialState`
 * and only ever hands that same state back to the same engine, so the erasure
 * is safe by construction.
 */
export type AnyGameModule = GameModule<unknown, unknown, unknown>;

/**
 * The single erasure point in the codebase. Games call it on their default
 * export and keep full type safety on the inside.
 *
 * Why a cast is unavoidable: `View` is `ComponentType<GameViewProps<TState, TMove>>`,
 * and a component's props sit in a contravariant position. `GameViewProps<unknown, unknown>`
 * is therefore not assignable to `GameViewProps<SudokuState, SudokuMove>`, so no
 * amount of variance annotation makes a concrete module structurally assignable
 * to the erased one. Confining that to one exported function means the shell
 * and every game stay cast-free.
 */
export function defineGame<TState, TMove, TConfig>(
  module: GameModule<TState, TMove, TConfig>
): AnyGameModule {
  return module as unknown as AnyGameModule;
}
