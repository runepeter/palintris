import { describe, expect, it } from 'vitest';
import { moveAnimationFor } from '../moveAnimation';

describe('moveAnimationFor', () => {
  it('gir hvert verktøy en tydelig profil', () => {
    expect(moveAnimationFor('swap', { clear: true, reduced: false, timed: false })).toMatchObject({ detailed: true, moveMs: 520 });
    expect(moveAnimationFor('rotate', { clear: true, reduced: false, timed: false })).toMatchObject({ detailed: true, moveMs: 760 });
    expect(moveAnimationFor('mirror', { clear: true, reduced: false, timed: false })).toMatchObject({ detailed: true, moveMs: 820 });
    expect(moveAnimationFor('insertWild', { clear: true, reduced: false, timed: false })).toMatchObject({
      detailed: true,
      moveMs: 620,
      enterDelayMs: 220,
    });
    expect(moveAnimationFor('remove', { clear: true, reduced: false, timed: false })).toMatchObject({
      detailed: true,
      moveMs: 620,
      moveDelayMs: 200,
      exitMs: 360,
    });
  });

  it('beholder dagens raske profil når valget er av', () => {
    expect(moveAnimationFor('rotate', { clear: false, reduced: false, timed: false })).toEqual({
      detailed: false,
      moveMs: 220,
      moveDelayMs: 0,
      enterMs: 220,
      enterDelayMs: 0,
      exitMs: 120,
      totalMs: 220,
    });
  });

  it('redusert bevegelse og tidsmodus overstyrer tydelig profil', () => {
    expect(moveAnimationFor('mirror', { clear: true, reduced: true, timed: false }).totalMs).toBe(120);
    expect(moveAnimationFor('mirror', { clear: true, reduced: false, timed: true }).totalMs).toBe(220);
  });
});
