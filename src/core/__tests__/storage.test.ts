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

describe('kampanjeforsøk', () => {
  it('bevarer forsøk og tilgang ved roundtrip uten å endre gamle felter', () => {
    const data = { ...defaultSave(), campaign: {
      firstAttempts: { 'w1-02': { levelId: 'w1-02', contentVersion: 1, ordinal: 1, activeMs: 3000, movesMade: 1, undoCount: 0 } },
      access: { offeredCheckpoints: [], masteredWorlds: [] },
    } };
    expect(parseSave(data)).toEqual(data);
  });
  it('bevarer stjerner og lager ugyldig tombstone ved ødelagt identifiserbart forsøk', () => {
    const data = { ...recordStars(defaultSave(), 'w1-01', 3, 1), campaign: {
      firstAttempts: { 'w1-02': { activeMs: Infinity }, 'w1-03': { levelId: 'w1-03', contentVersion: 1, ordinal: 1, activeMs: -1, movesMade: 0, undoCount: 0 } },
      access: { offeredCheckpoints: ['w1-03', 'w9-15'], masteredWorlds: [1, 7] },
    } };
    const parsed = parseSave(data)!;
    expect(parsed.stars).toEqual(data.stars);
    expect(parsed.campaign?.firstAttempts['w1-02']?.end?.reason).toBe('invalid');
    expect(parsed.campaign?.firstAttempts['w1-03']?.end?.reason).toBe('invalid');
    expect(parsed.campaign?.access).toEqual({ offeredCheckpoints: [], masteredWorlds: [] });
  });
  it('beholder varig mestring bare med ekte intro- og prøvestjerner', () => {
    let data = recordStars(defaultSave(), 'w1-01', 3, 1);
    data = recordStars(data, 'w1-15', 2, 1);
    expect(parseSave({ ...data, campaign: { firstAttempts: {}, access: { offeredCheckpoints: ['w1-15'], masteredWorlds: [1] } } })?.campaign?.access.masteredWorlds).toEqual([1]);
  });
});

it('behandler umulige og dupliserte forsøk som ugyldige, ikke ferske sterke', () => {
  const attempt = { levelId: 'w1-02', contentVersion: 1, ordinal: 1, activeMs: 0, movesMade: 0, undoCount: 0, end: { reason: 'solved', movesUsed: 2 } };
  const parsed = parseSave({ ...defaultSave(), campaign: { firstAttempts: { 'w1-02': attempt, 'w1-03': { ...attempt, levelId: 'w1-03', movesMade: 2 } } } })!;
  expect(parsed.campaign?.firstAttempts['w1-02']?.end?.reason).toBe('invalid');
  const ordinals = Object.values(parsed.campaign!.firstAttempts).map((a) => a.ordinal);
  expect(new Set(ordinals).size).toBe(ordinals.length);
});

it('bevarer identifiserbart forsøksnivå selv om record-nøkkelen er skadet', () => {
  const parsed = parseSave({ ...defaultSave(), campaign: { firstAttempts: { broken: {
    levelId: 'w1-02', contentVersion: 1, ordinal: 1, activeMs: 90000, movesMade: 2, undoCount: 1,
  } } } })!;
  expect(parsed.campaign?.firstAttempts['w1-02']?.end?.reason).toBe('invalid');
});

it('lar store ødelagte valgfrie forsøksdata falle trygt tilbake', () => {
  const data = { ...recordStars(defaultSave(), 'w1-01', 3, 1), campaign: { firstAttempts: Array(150000).fill(0) } };
  expect(() => parseSave(data)).not.toThrow();
  expect(parseSave(data)?.stars).toEqual(data.stars);
});

it('beskytter begge nivå-IDer ved konflikt og lar ikke senere duplikat gjenopplive dem', () => {
  const attempt = { levelId: 'w1-02', contentVersion: 1, ordinal: 1, activeMs: 90000, movesMade: 2, undoCount: 1 };
  const parsed = parseSave({ ...defaultSave(), campaign: { firstAttempts: { 'w1-03': attempt, 'w1-02': { ...attempt, ordinal: 2 } } } })!;
  expect(parsed.campaign?.firstAttempts['w1-02']?.end?.reason).toBe('invalid');
  expect(parsed.campaign?.firstAttempts['w1-03']?.end?.reason).toBe('invalid');
});
