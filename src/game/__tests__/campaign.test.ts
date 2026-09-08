import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../content/campaign';
import { levelId, LEVELS_PER_WORLD, WORLD_GATE } from '../../core/progression';
import type { StorageLike } from '../../core/storage';
import { CampaignMode } from '../modes/campaign';
import { SaveStore } from '../saveStore';

const mem = (): StorageLike => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('CampaignMode', () => {
  it('laster nivå med regler, mål og budsjett fra kampanjen', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    const lvl = mode.load('w1-01');
    expect(lvl).not.toBeNull();
    if (lvl === null) return;
    const src = CAMPAIGN.levels[0]!;
    expect(lvl.world).toBe(1);
    expect(lvl.n).toBe(1);
    expect(lvl.target).toBe(src.target);
    expect(lvl.budget).toBe(src.budget);
    expect(lvl.targetExact).toBe(src.targetExact);
    expect(lvl.rules.allowedOps.has('swap')).toBe(true);
    expect(lvl.contentVersion).toBe(CAMPAIGN.contentVersion);
    expect(lvl.showBudget).toBe(true);
    expect(mode.load('w9-01')).toBeNull();
  });

  it('isUnlocked følger progresjonen', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    expect(mode.isUnlocked('w1-01')).toBe(true);
    expect(mode.isUnlocked('w1-02')).toBe(false);
    mode.onSolved('w1-01', 1);
    expect(mode.isUnlocked('w1-02')).toBe(true);
  });

  it('onSolved lagrer beste stjerner og gir neste nivå', () => {
    const store = new SaveStore(mem());
    const mode = new CampaignMode(store);
    const lvl = mode.load('w1-01')!;
    const first = mode.onSolved('w1-01', lvl.budget);
    expect(first.stars).toBe(1);
    expect(first.previousStars).toBe(0);
    expect(first.nextLevelId).toBe('w1-02');
    expect(first.nextUnlocked).toBe(true);
    expect(first.worldJustUnlocked).toBeNull();
    const second = mode.onSolved('w1-01', lvl.target);
    expect(second.stars).toBe(3);
    expect(second.previousStars).toBe(1);
    expect(store.stars()['w1-01']).toBe(3);
    const third = mode.onSolved('w1-01', lvl.budget);
    expect(store.stars()['w1-01']).toBe(3);
    expect(third.stars).toBe(1);
  });

  it('tolvte løste nivå i en verden låser opp neste verden', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    for (let n = 1; n < WORLD_GATE; n++) {
      const out = mode.onSolved(levelId(1, n), 1);
      expect(out.worldJustUnlocked).toBeNull();
    }
    const out = mode.onSolved(levelId(1, WORLD_GATE), 1);
    expect(out.worldJustUnlocked).toBe(2);
    expect(mode.isUnlocked('w2-01')).toBe(true);
    expect(mode.onSolved(levelId(1, WORLD_GATE + 1), 1).worldJustUnlocked).toBeNull();
  });

  it('siste nivå i verden 1 uten nok løste gir neste nivå låst', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    const out = mode.onSolved(levelId(1, LEVELS_PER_WORLD), 1);
    expect(out.nextLevelId).toBe('w2-01');
    expect(out.nextUnlocked).toBe(false);
  });

  it('over budsjett gir 0 stjerner og lagrer ingenting', () => {
    const store = new SaveStore(mem());
    const mode = new CampaignMode(store);
    const lvl = mode.load('w1-01')!;
    const out = mode.onSolved('w1-01', lvl.budget + 1);
    expect(out.stars).toBe(0);
    expect(store.stars()['w1-01']).toBeUndefined();
    expect(out.nextUnlocked).toBe(false);
  });
});
