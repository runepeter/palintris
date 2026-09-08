import { describe, expect, it } from 'vitest';
import type { StorageLike } from '../../core/storage';
import { SAVE_KEY } from '../../core/storage';
import { SaveStore } from '../saveStore';

const mem = (): StorageLike & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('SaveStore', () => {
  it('laster default og lagrer ved update', () => {
    const s = mem();
    const store = new SaveStore(s);
    expect(store.stars()).toEqual({});
    store.update((d) => ({ ...d, blitz: { best: 7 } }));
    expect(store.data.blitz.best).toBe(7);
    expect(JSON.parse(s.map.get(SAVE_KEY) ?? '{}')).toMatchObject({ blitz: { best: 7 } });
  });

  it('setSettings flettes og lagres', () => {
    const s = mem();
    const store = new SaveStore(s);
    store.setSettings({ reducedMotion: true });
    expect(store.data.settings).toEqual({ sound: true, music: true, reducedMotion: true, colorBlind: false });
    expect(new SaveStore(s).data.settings.reducedMotion).toBe(true);
  });
});
