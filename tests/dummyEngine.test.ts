import { describe, expect, it } from 'vitest';

import { dummyEngine } from '@games/_dummy/engine/dummyEngine';
import { type DummyState } from '@games/_dummy/engine/types';

/**
 * Engine tests need no DOM and no renderer — that separation is the whole point
 * of keeping `render` out of the engine interface (docs/GAME_CONTRACT.md §2).
 */

function fresh(difficulty: 1 | 3 | 5): DummyState {
  const state = dummyEngine.createInitialState(dummyEngine.getDifficultyConfig(difficulty));
  if (state instanceof Promise) throw new Error('this engine is synchronous');
  return state;
}

describe('dummy engine', () => {
  it('derives its board from the difficulty', () => {
    expect(fresh(1).tiles).toHaveLength(3);
    expect(fresh(3).tiles).toHaveLength(6);
    expect(fresh(5).tiles).toHaveLength(9);
  });

  it('never mutates the state it is given', () => {
    const before = fresh(1);
    const snapshot = structuredClone(before);

    const after = dummyEngine.applyMove(before, { kind: 'mark', index: 0 });

    expect(before).toEqual(snapshot);
    expect(after).not.toBe(before);
    expect(after.tiles[0]).toBe(true);
  });

  it('rejects marking a tile twice, and points at the offending cell', () => {
    const marked = dummyEngine.applyMove(fresh(1), { kind: 'mark', index: 0 });
    const verdict = dummyEngine.validate(marked, { kind: 'mark', index: 0 });

    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.reason).toMatch(/ya está marcada/);
      expect(verdict.cells).toEqual([{ row: 0, col: 0 }]);
    }
  });

  it('rejects a tile that does not exist', () => {
    expect(dummyEngine.validate(fresh(1), { kind: 'mark', index: 99 }).ok).toBe(false);
  });

  it('reports progress and reaches a won status', () => {
    const state = dummyEngine.applyMove(fresh(1), { kind: 'winNow' });

    expect(dummyEngine.getProgress(state)).toBe(1);
    expect(dummyEngine.checkStatus(state)).toEqual({ kind: 'won' });
  });

  it('hints the first unmarked tile, and stops hinting once solved', () => {
    const partial = dummyEngine.applyMove(fresh(1), { kind: 'mark', index: 0 });

    expect(dummyEngine.getHint?.(partial)?.cells).toEqual([{ row: 0, col: 1 }]);
    expect(dummyEngine.getHint?.(dummyEngine.applyMove(partial, { kind: 'winNow' }))).toBeNull();
  });

  it('round-trips through serialize/deserialize', () => {
    const state = dummyEngine.applyMove(fresh(5), { kind: 'mark', index: 4 });
    const restored = dummyEngine.deserialize(dummyEngine.serialize(state), 1);

    expect(restored).toEqual(state);
  });

  it('refuses a state saved by a newer build instead of guessing', () => {
    const raw = dummyEngine.serialize(fresh(1));

    expect(() => dummyEngine.deserialize(raw, 99)).toThrow(/newer version/);
    expect(() => dummyEngine.deserialize('{"v":1}', 1)).toThrow(/Corrupt/);
  });
});
