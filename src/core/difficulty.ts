import { type Difficulty } from './contract';

/**
 * The shared 1–5 scale. Every game shows the same picker; each game decides
 * what each level means through its own `getDifficultyConfig`.
 *
 * Phase 4 (docs/PLAN.md) extends this with per-level tokens and per-game
 * persistence. For now it is the labels and nothing more.
 */

export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5];

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  1: 'Fácil',
  2: 'Casual',
  3: 'Normal',
  4: 'Difícil',
  5: 'Experto',
};

export const DEFAULT_DIFFICULTY: Difficulty = 3;

/** Options for `<DifficultyPicker>`, limited to what a game actually implements. */
export function difficultyOptions(
  available: readonly Difficulty[]
): { value: Difficulty; label: string }[] {
  return DIFFICULTIES.filter((level) => available.includes(level)).map((level) => ({
    value: level,
    label: DIFFICULTY_LABELS[level],
  }));
}

/** The level a game starts on: its default if supported, else its easiest. */
export function defaultDifficultyFor(available: readonly Difficulty[]): Difficulty {
  if (available.includes(DEFAULT_DIFFICULTY)) return DEFAULT_DIFFICULTY;
  return available[0] ?? DEFAULT_DIFFICULTY;
}
