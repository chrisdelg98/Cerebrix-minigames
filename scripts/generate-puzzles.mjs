/**
 * Offline puzzle generator — produces src/games/sudoku/data/puzzles-{1..5}.json.
 *
 * This runs at authoring time, not in the app. Phase 5b moves generation into a
 * Web Worker with difficulty calibrated by the techniques a puzzle actually
 * requires; this one calibrates by clue count, which is cruder but enough to
 * make the game playable and to prove the shell runs a real game.
 *
 *   node scripts/generate-puzzles.mjs [count]
 *
 * Every puzzle emitted is verified to have EXACTLY ONE solution. A Sudoku with
 * two solutions is not a Sudoku: the player can reach a full, consistent grid
 * that the game refuses to accept, with no way to understand why.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src/games/sudoku/data');

/** Clues left on the board, per difficulty level. 17 is the known minimum. */
const CLUES = { 1: 45, 2: 40, 3: 34, 4: 30, 5: 26 };

const PER_DIFFICULTY = Number(process.argv[2] ?? 50);

/* ─────────────────────────── Grid helpers ─────────────────────────── */

const peersOf = (() => {
  const cache = [];
  for (let i = 0; i < 81; i++) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const peers = new Set();

    for (let k = 0; k < 9; k++) {
      peers.add(row * 9 + k);
      peers.add(k * 9 + col);
      peers.add((boxRow + Math.floor(k / 3)) * 9 + (boxCol + (k % 3)));
    }
    peers.delete(i);
    cache.push([...peers]);
  }
  return cache;
})();

function canPlace(grid, index, value) {
  for (const peer of peersOf[index]) {
    if (grid[peer] === value) return false;
  }
  return true;
}

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ─────────────────────────── Solving ─────────────────────────── */

/**
 * Counts solutions, stopping at `limit`. Counting past 2 is wasted work: the
 * only question ever asked is "is this unique?".
 */
function countSolutions(grid, limit = 2) {
  // Most-constrained cell first. Without it, digging a 26-clue puzzle spends
  // minutes in the search instead of milliseconds.
  let best = -1;
  let bestCandidates = null;

  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const candidates = [];
    for (let v = 1; v <= 9; v++) if (canPlace(grid, i, v)) candidates.push(v);
    if (candidates.length === 0) return 0;
    if (bestCandidates === null || candidates.length < bestCandidates.length) {
      best = i;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }

  if (best === -1) return 1; // full grid

  let found = 0;
  for (const value of bestCandidates) {
    grid[best] = value;
    found += countSolutions(grid, limit - found);
    grid[best] = 0;
    if (found >= limit) break;
  }
  return found;
}

function solve(grid) {
  const working = [...grid];
  const search = () => {
    let best = -1;
    let bestCandidates = null;
    for (let i = 0; i < 81; i++) {
      if (working[i] !== 0) continue;
      const candidates = [];
      for (let v = 1; v <= 9; v++) if (canPlace(working, i, v)) candidates.push(v);
      if (candidates.length === 0) return false;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        best = i;
        bestCandidates = candidates;
      }
    }
    if (best === -1) return true;
    for (const value of shuffled(bestCandidates)) {
      working[best] = value;
      if (search()) return true;
      working[best] = 0;
    }
    return false;
  };
  return search() ? working : null;
}

/* ─────────────────────────── Generating ─────────────────────────── */

function fullGrid() {
  const grid = new Array(81).fill(0);
  return solve(grid);
}

/**
 * Removes clues while the solution stays unique. Symmetric removal (a cell and
 * its 180° partner) is what makes a Sudoku *look* like a Sudoku — asymmetric
 * boards read as noise even when they are perfectly valid.
 */
function dig(full, targetClues) {
  const grid = [...full];
  let clues = 81;

  for (const index of shuffled([...Array(81).keys()])) {
    if (clues <= targetClues) break;
    const partner = 80 - index;
    if (grid[index] === 0) continue;

    const removed = [index];
    const backup = [grid[index]];
    grid[index] = 0;

    if (partner !== index && grid[partner] !== 0 && clues - 1 > targetClues) {
      removed.push(partner);
      backup.push(grid[partner]);
      grid[partner] = 0;
    }

    if (countSolutions([...grid]) === 1) {
      clues -= removed.length;
    } else {
      removed.forEach((cell, i) => {
        grid[cell] = backup[i];
      });
    }
  }

  return { grid, clues };
}

const toString81 = (grid) => grid.map((v) => (v === 0 ? '.' : String(v))).join('');

/* ─────────────────────────── Main ─────────────────────────── */

mkdirSync(OUT_DIR, { recursive: true });

for (const [difficulty, targetClues] of Object.entries(CLUES)) {
  const puzzles = [];
  const started = Date.now();

  while (puzzles.length < PER_DIFFICULTY) {
    const full = fullGrid();
    if (!full) continue;

    const { grid, clues } = dig(full, targetClues);
    // Digging is best-effort: reject a board that did not get close enough,
    // rather than shipping an "expert" puzzle with 40 clues.
    if (clues > targetClues + 4) continue;

    puzzles.push({ p: toString81(grid), s: toString81(full), c: clues });
  }

  const file = join(OUT_DIR, `puzzles-${difficulty}.json`);
  writeFileSync(file, `${JSON.stringify({ difficulty: Number(difficulty), puzzles })}\n`, 'utf8');

  const avg = (puzzles.reduce((t, p) => t + p.c, 0) / puzzles.length).toFixed(1);
  console.log(
    `dificultad ${difficulty}: ${String(puzzles.length)} puzzles, ` +
      `${avg} pistas promedio (objetivo ${String(targetClues)}), ` +
      `${String(Date.now() - started)}ms`
  );
}
