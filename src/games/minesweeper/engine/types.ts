/** A board is cols × rows; not square, which is the point of this game existing. */
export interface MinesweeperState {
  cols: number;
  rows: number;
  mines: number;
  /** -1 for a mine, otherwise the neighbouring mine count. Empty until seeded. */
  values: number[];
  revealed: boolean[];
  flagged: boolean[];
  /**
   * Mines are laid on the FIRST reveal, not at creation: the opening click has
   * to be safe, and it cannot be safe if the board was decided before it.
   */
  seeded: boolean;
  /** The mine that ended the game, so the sprite can single it out. -1 while alive. */
  detonated: number;
  /** Kept in state so the same seed lays the same minefield. */
  seed: string;
}

export type MinesweeperMove =
  | { kind: 'reveal'; index: number }
  | { kind: 'flag'; index: number }
  /** Reveal every unflagged neighbour of a satisfied number. */
  | { kind: 'chord'; index: number };

export interface MinesweeperConfig {
  cols: number;
  rows: number;
  mines: number;
}
