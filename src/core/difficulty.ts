import { type Difficulty } from './contract';

/**
 * The shared 1–5 scale. Every game shows the same picker; each game decides
 * what each level means through its own `getDifficultyConfig`.
 *
 * The scale lives in /core and its colours live in /design — this file is the
 * seam. /design cannot import /core, so the levels travel to the picker as
 * plain options carrying a token reference, and the picker never learns what a
 * difficulty is.
 */

export const DIFFICULTIES: readonly Difficulty[] = [1, 2, 3, 4, 5];

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  1: 'Fácil',
  2: 'Casual',
  3: 'Normal',
  4: 'Difícil',
  5: 'Experto',
};

/** Declared in design/tokens/theme.css, one per level. */
export const DIFFICULTY_COLORS: Readonly<Record<Difficulty, string>> = {
  1: 'var(--c-difficulty-1)',
  2: 'var(--c-difficulty-2)',
  3: 'var(--c-difficulty-3)',
  4: 'var(--c-difficulty-4)',
  5: 'var(--c-difficulty-5)',
};

/** Only a fallback for a game that declares nothing. */
export const DEFAULT_DIFFICULTY: Difficulty = 1;

/** Options for `<DifficultyPicker>`, limited to what a game actually implements. */
export function difficultyOptions(
  available: readonly Difficulty[]
): { value: Difficulty; label: string; color: string }[] {
  return DIFFICULTIES.filter((level) => available.includes(level)).map((level) => ({
    value: level,
    label: DIFFICULTY_LABELS[level],
    color: DIFFICULTY_COLORS[level],
  }));
}

/**
 * The level a game opens on when it has never been played: the EASIEST one it
 * declares.
 *
 * Not the middle of the scale. A first board should be winnable — landing
 * someone on "Normal" the first time they open a game they have never seen is
 * how a puzzle stops being inviting. Once they have played, the level they
 * chose is remembered per game and wins over this.
 */
export function defaultDifficultyFor(available: readonly Difficulty[]): Difficulty {
  return DIFFICULTIES.find((level) => available.includes(level)) ?? DEFAULT_DIFFICULTY;
}

/**
 * Narrows a number read back from storage.
 *
 * Storage speaks in primitives — it cannot import this type — so anything
 * coming out of it has to be checked before it re-enters the scale. A stored
 * value from a build where the game supported more levels must not resurrect a
 * level the game no longer declares.
 */
export function asDifficulty(
  value: number | null,
  available: readonly Difficulty[]
): Difficulty | null {
  if (value === null) return null;
  const found = DIFFICULTIES.find((level) => level === value);
  return found !== undefined && available.includes(found) ? found : null;
}
