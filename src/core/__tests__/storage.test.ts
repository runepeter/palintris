import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../storage';
import {
  defaultSave,
  LEGACY_SETTINGS_KEY,
  loadSave,
  markIntroSeen,
  parseSave,
  persistSave,
  recordStars,
  SAVE_KEY,
  setDailyProgress,
  starMap,
} from '../storage';

const memStorage = (init: Record<string, string> = {}): StorageLike & { data: Map<string, string> } => {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
};

describe('loadSave', () => {
  it('gir default når ingenting er lagret', () => {
    expect(loadSave(memStorage())).toEqual(defaultSave());
    expect(defaultSave().settings.clearAnimations).toBe(true);
  });

  it('leser lagret data', () => {
    const s = memStorage();
    const data = recordStars(defaultSave(), 'w1-01', 2, 1);
    persistSave(s, data);
    expect(loadSave(s)).toEqual(data);
  });

  it('migrerer gamle innstillinger', () => {
    const s = memStorage({
      [LEGACY_SETTINGS_KEY]: JSON.stringify({ soundEnabled: false, musicEnabled: true, particlesEnabled: false, colorBlindMode: true }),
    });
    const data = loadSave(s);
    expect(data.settings).toEqual({ sound: false, music: true, reducedMotion: true, colorBlind: true, clearAnimations: true });
    expect(data.stars).toEqual({});
  });

  it('ignorerer gamle innstillinger når ny lagring finnes', () => {
    const s = memStorage({ [LEGACY_SETTINGS_KEY]: JSON.stringify({ soundEnabled: false }) });
    persistSave(s, defaultSave());
    expect(loadSave(s).settings.sound).toBe(true);
  });

  it('gir default ved korrupt JSON', () => {
    expect(loadSave(memStorage({ [SAVE_KEY]: '{not json' }))).toEqual(defaultSave());
  });

  it('gir default ved feil saveVersion', () => {
    expect(loadSave(memStorage({ [SAVE_KEY]: JSON.stringify({ saveVersion: 99 }) }))).toEqual(defaultSave());
  });
});

describe('recordStars', () => {
  it('beholder beste stjerner', () => {
    let d = recordStars(defaultSave(), 'w1-01', 3, 1);
    d = recordStars(d, 'w1-01', 1, 2);
    expect(d.stars['w1-01']).toEqual({ stars: 3, contentVersion: 1 });
  });
  it('oppdaterer ved lik eller bedre', () => {
    let d = recordStars(defaultSave(), 'w1-01', 2, 1);
    d = recordStars(d, 'w1-01', 2, 2);
    expect(d.stars['w1-01']).toEqual({ stars: 2, contentVersion: 2 });
  });
  it('starMap gir bare tall', () => {
    const d = recordStars(defaultSave(), 'w1-02', 1, 1);
    expect(starMap(d)).toEqual({ 'w1-02': 1 });
  });
});

describe('persistSave', () => {
  it('svelger feil fra storage', () => {
    const broken: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(() => persistSave(broken, defaultSave())).not.toThrow();
  });
});

describe('parseSave', () => {
  it('godtar gyldig data og fyller manglende valgfrie felt', () => {
    const d = parseSave({
      saveVersion: 1,
      stars: { 'w1-01': { stars: 2, contentVersion: 1 } },
      daily: { attempts: [], streak: 0 },
      blitz: { best: 3 },
      settings: { sound: true, music: false, reducedMotion: false, colorBlind: true },
    });
    expect(d).not.toBeNull();
    expect(d?.introsSeen).toEqual([]);
    expect(d?.contentVersion).toBe(1);
    expect(d?.daily.inProgress).toBeUndefined();
    expect(d?.settings.clearAnimations).toBe(true);
  });
  it('avviser feil form på stars', () => {
    expect(parseSave({ saveVersion: 1, stars: { 'w1-01': 'oops' } })).toBeNull();
  });
  it('beholder stjernene når inProgress er ødelagt', () => {
    const d = parseSave({
      saveVersion: 1,
      stars: { 'w1-01': { stars: 3, contentVersion: 1 } },
      daily: { attempts: [], streak: 4, inProgress: { puzzleId: 7, commands: 'tull' } },
      blitz: { best: 3 },
      settings: { sound: true, music: true, reducedMotion: false, colorBlind: false },
    });
    expect(d).not.toBeNull();
    expect(d?.daily.inProgress).toBeUndefined();
    expect(d?.daily.streak).toBe(4);
    expect(d?.stars['w1-01']).toEqual({ stars: 3, contentVersion: 1 });
  });
  it('ødelagt introsSeen og contentVersion faller til default', () => {
    const d = parseSave({
      saveVersion: 1,
      contentVersion: 'to',
      stars: { 'w1-01': { stars: 1, contentVersion: 1 } },
      daily: { attempts: [], streak: 0 },
      blitz: { best: 0 },
      settings: { sound: true, music: true, reducedMotion: false, colorBlind: false },
      introsSeen: [1, 'w2-01'],
    });
    expect(d).not.toBeNull();
    expect(d?.introsSeen).toEqual([]);
    expect(d?.contentVersion).toBe(1);
    expect(d?.stars['w1-01']).toEqual({ stars: 1, contentVersion: 1 });
  });
  it('obligatoriske felt er fortsatt strenge', () => {
    const valid = {
      saveVersion: 1,
      stars: {},
      daily: { attempts: [], streak: 0 },
      blitz: { best: 0 },
      settings: { sound: true, music: true, reducedMotion: false, colorBlind: false },
    };
    expect(parseSave({ ...valid, daily: { attempts: [], streak: 'null' } })).toBeNull();
    expect(parseSave({ ...valid, daily: { attempts: [{ puzzleId: 1 }], streak: 0 } })).toBeNull();
    expect(parseSave({ ...valid, blitz: { best: 'mange' } })).toBeNull();
  });
  it('avviser feil saveVersion', () => {
    expect(parseSave({ saveVersion: 2 })).toBeNull();
  });
  it('loadSave gir default ved ugyldig form uten legacy', () => {
    expect(loadSave(memStorage({ [SAVE_KEY]: JSON.stringify({ saveVersion: 1, stars: 5 }) }))).toEqual(defaultSave());
  });
});

describe('intro og daily progress', () => {
  it('markIntroSeen er idempotent', () => {
    const d = markIntroSeen(markIntroSeen(defaultSave(), 'w2-01'), 'w2-01');
    expect(d.introsSeen).toEqual(['w2-01']);
  });
  it('setDailyProgress setter og fjerner', () => {
    const p = {
      puzzleId: 'daily-2026-09-08-v1',
      startedAt: '2026-09-08T10:00:00.000Z',
      elapsedMs: 1200,
      commands: [{ type: 'swap' as const, a: 0, b: 1 }],
    };
    const d = setDailyProgress(defaultSave(), p);
    expect(d.daily.inProgress).toEqual(p);
    expect(setDailyProgress(d, undefined).daily.inProgress).toBeUndefined();
  });
});
