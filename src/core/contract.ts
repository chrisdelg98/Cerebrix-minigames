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

/**
 * El estante donde vive el juego en la portada: se piensa, o se juega.
 *
 * Existe separado de `tags` porque responde otra pregunta. `tags` describen de
 * qué va un juego y son varios; esto es uno solo, y es la única división que la
 * portada ofrece como filtro.
 *
 * No se deriva de los tags a propósito. Secuencia es 'memoria' y 'velocidad',
 * Memoria es 'memoria' a secas, y Trazo es 'lógica' aunque se juegue con el
 * dedo: leer el estante desde esa lista sería el shell suponiendo cosas sobre
 * juegos que no conoce, que es exactamente lo que el contrato existe para
 * evitar. Lo declara la metadata, como `supportsUndo`.
 */
export type GameCategory = 'lógica' | 'arcade';

/**
 * A rule drawn instead of described.
 *
 * `howToPlay` says what to do; an example shows what "correcto" looks like next
 * to what "incorrecto" looks like. For a deduction game that difference is the
 * whole lesson, and a paragraph is a bad way to teach it — the reference apps
 * all draw a two-by-two board and let it speak.
 *
 * The figure is a component, like `icon`: /core paints it without knowing what
 * it shows, and it ships inside the game's lazy chunk, not the initial bundle.
 */
export interface GameExample {
  figure: ComponentType;
  /** One line under the drawing. Complete sentence, no more than two lines. */
  caption: string;
}

export interface GameMeta {
  /**
   * La clave del juego: inglés, kebab-case, neutral al idioma.
   *
   * NO es una etiqueta y no tiene por qué parecerse a `name`. `name`, `tagline`
   * y `howToPlay` son texto para el jugador y el día que haya multiidioma se
   * traducen; el id no puede traducirse porque vive en la URL y en el
   * almacenamiento del teléfono de cada jugador. Por eso se escribe en inglés,
   * que es el idioma de las claves de este código: «Lights Out» se llama
   * `lights-out` acá y se llamará así en cualquier idioma que hablemos después.
   *
   * Se elige una vez. Cambiarlo huerfaniza la partida guardada, el historial y
   * la dificultad recordada de todos los que ya jugaron — y no hay forma de
   * alcanzar esos datos para migrarlos. Si igual hay que cambiarlo, la limpieza
   * de useForgetUnknownGames descarta lo viejo en vez de dejarlo pudrirse.
   *
   * La carpeta del juego se llama igual que el id: las herramientas emparejan
   * los chunks del build por ahí (scripts/check-budget.mjs).
   */
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
  /** El estante de la portada. Uno solo, a diferencia de `tags`. */
  category: GameCategory;
  estimatedMinutes: [min: number, max: number];
  /**
   * Two or three lines of "how this is played", shown before the board.
   * The shell gates every game behind a start screen and has no idea what any
   * of them are about — so the rules travel with the game, like everything else.
   */
  howToPlay: string[];
  /**
   * Optional worked examples, shown under the steps. A game with a rule that is
   * easier to recognise than to read should draw it here.
   */
  examples?: GameExample[];
  /**
   * Si el shell ofrece deshacer y rehacer. Por defecto sí.
   *
   * Existe por Memoria: deshacer devolvería la carta a su lugar pero no te
   * haría olvidar lo que viste, así que sería un botón para hacer trampa. El
   * juego no puede apagarlo por su cuenta — deshacer es del shell — y parchear
   * el shell para que conozca a Memoria sería exactamente lo que el contrato
   * existe para evitar. Así que lo declara la metadata, como todo lo demás.
   */
  supportsUndo?: boolean;
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
  /**
   * The last move the engine turned down, and the cells it pointed at.
   *
   * The contract documented `ValidationResult.cells` as "cells to highlight in
   * red" and then gave the view no way to receive them: the shell knew which
   * squares to flag and could not tell the component that draws them. Found
   * while building Sudoku, closed here.
   */
  rejection: { reason: string; cells: CellRef[] } | null;
}

/* ─────────────────────────── Footer actions ─────────────────────────── */

export interface GameAction<TMove> {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  /** The move to dispatch, or null if it only flips view-local state. */
  toMove?: () => TMove | null;
}

/*
 * `toggle` used to live here. It was declared and unusable: the shell could
 * draw an action as active, but the view had no way to read that state back,
 * so a toggle in the action bar would light up without changing what tapping a
 * cell did. Sudoku's pencil mode ended up in its own number pad instead, which
 * is also where the finger already is. Removed rather than propped up —
 * contract surface nobody can use is worse than no surface.
 */

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
