import { describe, expect, it } from 'vitest';
import { WORLD_COUNT } from '../../core/progression';
import { createRng } from '../../core/rng';
import { FREE_BUDGET, freeLevelId, FreeMode, parseFreeLevelId } from '../modes/free';
import type { BoardMode } from '../modes/types';

describe('freeLevelId', () => {
  it('er rundtur', () => {
    expect(freeLevelId(2, 3)).toBe('free-w2-3');
    expect(parseFreeLevelId('free-w2-3')).toEqual({ world: 2, n: 3 });
  });

  it('gir null for ugyldig id', () => {
    expect(parseFreeLevelId('w1-01')).toBeNull();
    expect(parseFreeLevelId('free-w0-1')).toBeNull();
    expect(parseFreeLevelId('free-w9-1')).toBeNull();
  });
});

describe('FreeMode', () => {
  it('laster et brett uten budsjettvisning og uten tidtaking', () => {
    const mode = new FreeMode(1, createRng(42));
    const lvl = mode.load('free-w1-1');
    expect(lvl).not.toBeNull();
    if (lvl === null) return;
    expect(lvl.id).toBe('free-w1-1');
    expect(lvl.world).toBe(1);
    expect(lvl.n).toBe(1);
    expect(lvl.showBudget).toBe(false);
    expect(lvl.budget).toBe(FREE_BUDGET);
    expect(lvl.rules.allowedOps.has('swap')).toBe(true);
    const asMode: BoardMode = mode;
    expect(asMode.isUnlocked('free-w1-1')).toBe(true);
  });

  it('gir null for ugyldig id', () => {
    const mode = new FreeMode(1, createRng(1));
    expect(mode.load('free-w7-1')).toBeNull();
    expect(mode.load('tull')).toBeNull();
  });

  it('onSolved gir stjerner og neste id i samme verden', () => {
    const mode = new FreeMode(1, createRng(7));
    const lvl = mode.load('free-w1-4')!;
    const out = mode.onSolved('free-w1-4', lvl.target);
    expect(out.stars).toBe(3);
    expect(out.previousStars).toBe(0);
    expect(out.nextLevelId).toBe('free-w1-5');
    expect(out.nextUnlocked).toBe(true);
    expect(out.worldJustUnlocked).toBeNull();

    // Budsjettet er ikke en reell grense lenger; ett trekk over målet gir to stjerner.
    const overTarget = mode.onSolved('free-w1-4', lvl.target + 1);
    expect(overTarget.stars).toBe(2);
  });

  it('onSolved uten lastet brett gir 0 stjerner', () => {
    const mode = new FreeMode(1, createRng(3));
    const out = mode.onSolved('free-w1-2', 1);
    expect(out.stars).toBe(0);
    expect(out.nextLevelId).toBe('free-w1-3');
  });

  it('gir et brett i hver verden', () => {
    // På høyere ramp-nivå kollapser movesRange til én verdi, og verden 2 og 3 blir
    // uten treff fordi eksakt minimum 3 er for sjeldent på korte brett.
    const mode = new FreeMode(1, createRng(21));
    for (let w = 1; w <= WORLD_COUNT; w++) {
      const lvl = mode.load(freeLevelId(w, 5));
      expect(lvl, `verden ${w}`).not.toBeNull();
      expect(lvl?.target).toBeGreaterThanOrEqual(1);
    }
  });

  it('gir nye brett ved gjentatt lasting av samme id', () => {
    const mode = new FreeMode(1, createRng(11));
    const keys = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const lvl = mode.load('free-w1-1');
      expect(lvl).not.toBeNull();
      keys.add(lvl?.tiles.map((t) => t.symbol).join('') ?? '');
    }
    expect(keys.size).toBeGreaterThan(1);
  });
});
