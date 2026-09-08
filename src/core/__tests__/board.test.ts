import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { apply, createBoard, toSnapshot } from '../board';
import type { Command } from '../commands';
import { makeRules, ALL_OPS } from '../rules';
import { symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(ALL_OPS);
const board = (s: string) => createBoard(tilesFromString(s), { wild: 1, remove: 1 });

describe('apply', () => {
  it('legger snapshot i historikk ved lovlig trekk', () => {
    const r = apply(rules, board('ABC'), { type: 'swap', a: 0, b: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(symbolKey(r.value.tiles)).toBe('BAC');
      expect(r.value.history).toHaveLength(1);
      expect(symbolKey(r.value.history[0]!.tiles)).toBe('ABC');
    }
  });

  it('avvist trekk endrer ingenting', () => {
    const r = apply(rules, board('ABC'), { type: 'swap', a: 0, b: 2 });
    expect(r).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('undo gjenoppretter brett, hånd og trekk', () => {
    const b0 = board('ABC');
    const b1 = apply(rules, b0, { type: 'insertWild', at: 0 });
    expect(b1.ok).toBe(true);
    if (!b1.ok) return;
    const b2 = apply(rules, b1.value, { type: 'undo' });
    expect(b2.ok).toBe(true);
    if (b2.ok) {
      expect(toSnapshot(b2.value)).toEqual(toSnapshot(b0));
      expect(b2.value.history).toHaveLength(0);
    }
  });

  it('undo på tom historikk avvises', () => {
    expect(apply(rules, board('ABC'), { type: 'undo' })).toEqual({ ok: false, reason: 'nothingToUndo' });
  });

  it('reset går til start og kan angres', () => {
    const b0 = board('ABCD');
    const b1 = apply(rules, b0, { type: 'swap', a: 0, b: 1 });
    const b2 = b1.ok ? apply(rules, b1.value, { type: 'remove', tileId: 3 }) : b1;
    const b3 = b2.ok ? apply(rules, b2.value, { type: 'reset' }) : b2;
    expect(b3.ok).toBe(true);
    if (!b3.ok) return;
    expect(toSnapshot(b3.value)).toEqual(toSnapshot(b0));
    expect(b3.value.history).toHaveLength(3);
    const b4 = apply(rules, b3.value, { type: 'undo' });
    expect(b4.ok).toBe(true);
    if (b4.ok && b2.ok) expect(toSnapshot(b4.value)).toEqual(toSnapshot(b2.value));
  });

  it('reset på startbrett er no-op', () => {
    const b0 = board('ABC');
    const r = apply(rules, b0, { type: 'reset' });
    expect(r.ok && r.value).toBe(b0);
  });
});

const cmdArb = (n: number): fc.Arbitrary<Command> =>
  fc.oneof(
    fc.record({ type: fc.constant('swap' as const), a: fc.integer({ min: 0, max: n }), b: fc.integer({ min: 0, max: n }) }),
    fc.record({
      type: fc.constant('rotate' as const),
      from: fc.integer({ min: 0, max: n }),
      to: fc.integer({ min: 0, max: n }),
      dir: fc.constantFrom('left' as const, 'right' as const),
    }),
    fc.record({ type: fc.constant('mirror' as const), from: fc.integer({ min: 0, max: n }), to: fc.integer({ min: 0, max: n }) }),
    fc.record({ type: fc.constant('insertWild' as const), at: fc.integer({ min: 0, max: n + 1 }) }),
    fc.record({ type: fc.constant('remove' as const), tileId: fc.integer({ min: 0, max: n + 3 }) })
  );

describe('undo egenskaper', () => {
  it('undo etter ethvert lovlig trekk gir forrige snapshot', () => {
    fc.assert(
      fc.property(fc.array(cmdArb(6), { maxLength: 30 }), (cmds) => {
        let state = createBoard(tilesFromString('ABCBAD'), { wild: 2, remove: 2 });
        for (const cmd of cmds) {
          const r = apply(rules, state, cmd);
          if (!r.ok) continue;
          const back = apply(rules, r.value, { type: 'undo' });
          expect(back.ok).toBe(true);
          if (back.ok) expect(toSnapshot(back.value)).toEqual(toSnapshot(state));
          state = r.value;
        }
      })
    );
  });
});
