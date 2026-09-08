import type { StarMap } from '../core/progression';
import type { SaveData, Settings, StorageLike } from '../core/storage';
import { loadSave, persistSave, starMap } from '../core/storage';

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

  setSettings(patch: Partial<Settings>): void {
    this.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }
}
