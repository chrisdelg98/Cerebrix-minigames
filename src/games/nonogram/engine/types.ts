/** What the player has decided about a cell. */
export const UNKNOWN = 0;
export const FILLED = 1;
export const CROSSED = 2;

export type Mark = typeof UNKNOWN | typeof FILLED | typeof CROSSED;

/** The numbers down the side of one line, in order. An empty line has none. */
export type Clue = readonly number[];

export interface NonogramState {
  size: number;
  /**
   * Row-major truth: `true` where the finished picture is painted.
   *
   * It lives in the state because a hint has to know the answer, and because
   * `checkStatus` cannot re-derive it — several pictures can share a set of
   * clues in general, and the one the player was given is this one.
   */
  solution: boolean[];
  marks: Mark[];
  /** Derived from `solution`, kept here so the view never recomputes per render. */
  rowClues: Clue[];
  colClues: Clue[];
}

/**
 * A whole stroke, not a square.
 *
 * Painting is done by dragging, and a drag that turned into eight moves would
 * take eight taps of «Deshacer» to walk back — the shell keeps one step per
 * dispatch, and one gesture has to be one step. The view shows the stroke as it
 * happens and sends it when the finger comes up.
 *
 * Absolute, not a toggle: the view decides what the mark is, the engine just
 * records it. That is what makes undo exact — replaying a toggle depends on what
 * was there before, replaying an assignment does not.
 */
export interface NonogramMove {
  indices: number[];
  mark: Mark;
}

export interface NonogramConfig {
  size: number;
  /** Share of painted cells aimed for. Lower reads as a sparser picture. */
  density: number;
}
