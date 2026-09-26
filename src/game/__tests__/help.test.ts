import { describe, expect, it } from 'vitest';
import type { OpName } from '../../core/rules';
import { helpSpec } from '../help';
import { introSatisfiedBy } from '../intro';

const ALL: readonly OpName[] = ['swap', 'rotate', 'mirror', 'insertWild', 'remove'];
const subsets = (): ReadonlySet<OpName>[] =>
  Array.from({ length: 1 << ALL.length }, (_, mask) => new Set(ALL.filter((_, i) => (mask & (1 << i)) !== 0))).filter((s) => s.size > 0);

describe('hjelp på brettet', () => {
  it('forklarer verktøyene brettet faktisk tillater', () => {
    expect(helpSpec(new Set(['swap'])).text).toContain('naboen');
    expect(helpSpec(new Set(['swap', 'rotate'])).text).toContain('hold og dra');
    expect(helpSpec(new Set(['swap', 'mirror'])).text).toContain('hold og dra');
    const hand = helpSpec(new Set(['swap', 'insertWild', 'remove']));
    expect(hand.text).toContain('Joker');
    expect(hand.text).toContain('Fjern');
    expect(helpSpec(new Set(['swap', 'insertWild'])).text).not.toContain('Fjern');
  });

  it('holder seg til to korte linjer og en kort form som ikke avkortes på 360 px', () => {
    for (const ops of subsets()) {
      const spec = helpSpec(ops);
      const lines = spec.text.split('\n');
      expect(lines.length, [...ops].join()).toBeLessThanOrEqual(2);
      for (const line of lines) expect(line.length, line).toBeLessThanOrEqual(44);
      expect((spec.compactText ?? '').length, spec.compactText).toBeLessThanOrEqual(30);
    }
  });

  it('lukkes av første godtatte trekk og er ikke en intro som merkes sett', () => {
    const spec = helpSpec(new Set(ALL));
    expect(spec.id).toBe('help');
    expect(introSatisfiedBy(spec, { type: 'swap', a: 0, b: 1 })).toBe(true);
    expect(introSatisfiedBy(spec, { type: 'undo' })).toBe(true);
  });
});

describe('kort form', () => {
  it('prioriterer gesten for utsnitt, deretter hånden', () => {
    expect(helpSpec(new Set(['swap', 'rotate', 'insertWild', 'remove'])).compactText).toContain('Hold og dra');
    expect(helpSpec(new Set(['swap', 'insertWild', 'remove'])).compactText).toContain('Fjern');
  });
});
