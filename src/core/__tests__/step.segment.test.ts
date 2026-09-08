import { describe, expect, it } from 'vitest';
import { applyMove } from '../step';
import { makeRules } from '../rules';
import { makeSnapshot, symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(['rotate', 'mirror']);
const snap = (s: string) => makeSnapshot(tilesFromString(s), { wild: 0, remove: 0 });
const key = (r: ReturnType<typeof applyMove>): string => (r.ok ? symbolKey(r.value.tiles) : `reject:${r.reason}`);

describe('rotate', () => {
  it('roterer segment ett steg til venstre', () => {
    expect(key(applyMove(rules, snap('ABCDE'), { type: 'rotate', from: 1, to: 3, dir: 'left' }))).toBe('ACDBE');
  });
  it('roterer segment ett steg til høyre', () => {
    expect(key(applyMove(rules, snap('ABCDE'), { type: 'rotate', from: 1, to: 3, dir: 'right' }))).toBe('ADBCE');
  });
  it('venstre og høyre er inverser', () => {
    const r1 = applyMove(rules, snap('ABCDE'), { type: 'rotate', from: 0, to: 4, dir: 'left' });
    expect(r1.ok).toBe(true);
    if (r1.ok) {
      expect(key(applyMove(rules, r1.value, { type: 'rotate', from: 0, to: 4, dir: 'right' }))).toBe('ABCDE');
    }
  });
  it('avviser segment på én brikke', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'rotate', from: 1, to: 1, dir: 'left' }))).toBe('reject:segmentTooShort');
  });
  it('avviser låst brikke i segmentet', () => {
    expect(key(applyMove(rules, snap('AbC'), { type: 'rotate', from: 0, to: 2, dir: 'left' }))).toBe('reject:segmentContainsLocked');
  });
  it('avviser from > to og utenfor rekkevidde', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'rotate', from: 2, to: 1, dir: 'left' }))).toBe('reject:outOfRange');
    expect(key(applyMove(rules, snap('ABC'), { type: 'rotate', from: 0, to: 3, dir: 'left' }))).toBe('reject:outOfRange');
  });
});

describe('mirror', () => {
  it('reverserer segment', () => {
    expect(key(applyMove(rules, snap('ABCDE'), { type: 'mirror', from: 1, to: 3 }))).toBe('ADCBE');
  });
  it('avviser segment på to brikker (det er swap)', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'mirror', from: 0, to: 1 }))).toBe('reject:segmentTooShort');
  });
  it('avviser låst brikke i segmentet', () => {
    expect(key(applyMove(rules, snap('AbCD'), { type: 'mirror', from: 0, to: 3 }))).toBe('reject:segmentContainsLocked');
  });
  it('teller ett trekk', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'mirror', from: 0, to: 2 });
    expect(r.ok && r.value.movesUsed).toBe(1);
  });
});
