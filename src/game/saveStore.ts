import type { StarMap } from '../core/progression';
import type { SaveData, Settings, StorageLike } from '../core/storage';
import { loadSave, persistSave, SAVE_KEY, starMap } from '../core/storage';

/** Holder SaveData i minnet og skriver gjennom til storage ved hver endring. */
export class SaveStore {
  private current: SaveData;

  constructor(private readonly storage: StorageLike) {
    this.current = loadSave(storage);
  }

  get data(): SaveData {
    return this.current;
  }

  stars(): StarMap {
    return starMap(this.current);
  }

  update(fn: (d: SaveData) => SaveData): void {
    this.current = fn(this.current);
    persistSave(this.storage, this.current);
  }

  tryUpdate(fn: (d: SaveData) => SaveData): boolean {
    try {
      const next = fn(this.current);
      this.storage.setItem(SAVE_KEY, JSON.stringify(next));
      this.current = next;
      return true;
    } catch {
      return false;
    }
  }

  setSettings(patch: Partial<Settings>): void {
    this.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }
}
