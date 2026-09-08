import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../core/storage';
import { BLITZ, BLITZ_RECIPES, BlitzClock, blitzBonusMs, BlitzQueue } from '../blitz';
import { BlitzMode } from '../modes/blitz';
import type { BoardMode } from '../modes/types';
import { SaveStore } from '../saveStore';

const mem = (): StorageLike => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('blitzBonusMs', () => {
  it('starter på grunnbonusen', () => {
    expect(blitzBonusMs(0, false)).toBe(6000);
  });

  it('faller ett steg for hvert femte løste brett', () => {
    expect(blitzBonusMs(4, false)).toBe(6000);
    expect(blitzBonusMs(5, false)).toBe(5000);
    expect(blitzBonusMs(10, false)).toBe(4000);
  });

  it('stopper på minimum og legger til målbonus', () => {
    expect(blitzBonusMs(20, false)).toBe(BLITZ.minBonusMs);
    expect(blitzBonusMs(20, true)).toBe(6000);
    expect(blitzBonusMs(0, true)).toBe(BLITZ.baseBonusMs + BLITZ.targetBonusMs);
  });
});

describe('BlitzClock', () => {
  it('starter på 45 sekunder og går ikke før start', () => {
    const clock = new BlitzClock();
    expect(clock.remainingMs).toBe(BLITZ.startMs);
    expect(clock.running).toBe(false);
    clock.tick(1000);
    expect(clock.remainingMs).toBe(BLITZ.startMs);

    clock.start();
    expect(clock.running).toBe(true);
    clock.tick(1500);
    expect(clock.remainingMs).toBe(BLITZ.startMs - 1500);
  });

  it('pause stopper tick, resume starter den igjen', () => {
    const clock = new BlitzClock();
    clock.start();
    clock.pause();
    expect(clock.running).toBe(false);
    clock.tick(5000);
    expect(clock.remainingMs).toBe(BLITZ.startMs);
    clock.resume();
    clock.tick(5000);
    expect(clock.remainingMs).toBe(BLITZ.startMs - 5000);
  });

  it('onSolved legger til bonus, men capper på 60 sekunder', () => {
    const clock = new BlitzClock();
    clock.start();
    clock.tick(2000);
    clock.onSolved(0, false);
    expect(clock.remainingMs).toBe(BLITZ.startMs - 2000 + BLITZ.baseBonusMs);
    clock.onSolved(0, true);
    clock.onSolved(0, true);
    expect(clock.remainingMs).toBe(BLITZ.capMs);
  });

  it('skip trekker fra og går ikke under 0', () => {
    const clock = new BlitzClock();
    clock.start();
    clock.skip();
    expect(clock.remainingMs).toBe(BLITZ.startMs - BLITZ.skipCostMs);
    for (let i = 0; i < 20; i++) clock.skip();
    expect(clock.remainingMs).toBe(0);
  });

  it('over blir sant ved 0 og klokken stopper', () => {
    const clock = new BlitzClock();
    clock.start();
    expect(clock.over).toBe(false);
    clock.tick(BLITZ.startMs + 1000);
    expect(clock.remainingMs).toBe(0);
    expect(clock.over).toBe(true);
    expect(clock.running).toBe(false);
    clock.resume();
    expect(clock.running).toBe(false);
  });
});

describe('BLITZ_RECIPES', () => {
  it('er tre korte oppskrifter med klient-løser', () => {
    expect(BLITZ_RECIPES).toHaveLength(3);
    for (const r of BLITZ_RECIPES) {
      expect(r.lengthRange).toEqual([4, 7]);
      expect(r.solverStates).toBe(50000);
    }
  });
});

describe('BlitzQueue', () => {
  it('gir ulike brett med gyldig mål og lengde', () => {
    const queue = new BlitzQueue(1234, 1);
    const first = queue.next();
    const second = queue.next();
    expect(first.id).not.toBe(second.id);
    for (const lvl of [first, second]) {
      expect(lvl.target).toBeGreaterThanOrEqual(1);
      expect(lvl.tiles.length).toBeGreaterThanOrEqual(4);
      expect(lvl.tiles.length).toBeLessThanOrEqual(7);
    }
  });

  it('peek gir neste brett uten å bruke det opp', () => {
    const queue = new BlitzQueue(99, 1);
    const peeked = queue.peek();
    expect(queue.peek()).toBe(peeked);
    expect(queue.next()).toBe(peeked);
    expect(queue.next()).not.toBe(peeked);
  });

  it('er deterministisk for samme frø', () => {
    const a = new BlitzQueue(7, 1);
    const b = new BlitzQueue(7, 1);
    expect(a.next().tiles.map((t) => t.symbol)).toEqual(b.next().tiles.map((t) => t.symbol));
  });
});

describe('BlitzMode', () => {
  it('teller løste brett og gir nytt fra køen', () => {
    const store = new SaveStore(mem());
    const mode = new BlitzMode(store, new BlitzQueue(5, 1));
    expect(mode.solved).toBe(0);

    const lvl = mode.load('next');
    expect(lvl.timed).toBe(false);
    expect(lvl.showBudget).toBe(false);
    expect(lvl.budget).toBe(999);
    const asMode: BoardMode = mode;
    expect(asMode.isUnlocked(lvl.id)).toBe(true);

    const out = mode.onSolved(lvl.id, lvl.target);
    expect(out.stars).toBe(3);
    expect(mode.solved).toBe(1);

    const next = mode.load('next');
    expect(next.id).not.toBe(lvl.id);
  });

  it('finish lagrer ny rekord', () => {
    const store = new SaveStore(mem());
    const mode = new BlitzMode(store, new BlitzQueue(6, 1));
    const lvl = mode.load('next');
    mode.onSolved(lvl.id, lvl.target);

    const first = mode.finish();
    expect(first).toEqual({ solved: 1, best: 1, isNewBest: true });
    expect(store.data.blitz.best).toBe(1);

    const worse = new BlitzMode(store, new BlitzQueue(6, 1));
    const second = worse.finish();
    expect(second).toEqual({ solved: 0, best: 1, isNewBest: false });
    expect(store.data.blitz.best).toBe(1);
  });
});
