import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../storage';
import { defaultSave, LEGACY_SETTINGS_KEY, loadSave, persistSave, recordStars, SAVE_KEY, starMap } from '../storage';

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
    expect(data.settings).toEqual({ sound: false, music: true, reducedMotion: true, colorBlind: true });
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
