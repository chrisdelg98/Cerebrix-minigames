import { CLUES, generatePuzzle, type GeneratedPuzzle } from './generate';

/**
 * The generator, off the main thread.
 *
 * Backtracking with uniqueness checking is the one thing in this app that can
 * hold a CPU for a noticeable stretch, and the main thread is where the board
 * has to keep responding at 60fps (docs/PLAN.md, change #5).
 *
 * It only wires messages — the algorithm lives in generate.ts so it can be
 * tested without spawning a thread.
 */

export interface GenerateRequest {
  difficulty: number;
  seed: string;
}

export type GenerateResponse = { ok: true; puzzle: GeneratedPuzzle } | { ok: false };

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const { difficulty, seed } = event.data;

  /*
   * Several attempts, keeping the BEST — fewest clues left — not the first that
   * works. A dig is one shuffled pass, so its result swings: taking the first
   * success handed back 30-clue "expert" boards when the target is 26, which is
   * a difficulty-4 board wearing a difficulty-5 label.
   *
   * At ~15ms an attempt this costs a tenth of a second on another thread, and
   * it stops early once a dig hits the target exactly.
   */
  const target = CLUES[difficulty] ?? 34;
  let best: GeneratedPuzzle | null = null;

  for (let attempt = 0; attempt < 8; attempt++) {
    const puzzle = generatePuzzle(difficulty, `${seed}:${String(attempt)}`);
    if (puzzle && (best === null || puzzle.c < best.c)) best = puzzle;
    if (best !== null && best.c <= target) break;
  }

  self.postMessage(
    (best === null ? { ok: false } : { ok: true, puzzle: best }) satisfies GenerateResponse
  );
};
