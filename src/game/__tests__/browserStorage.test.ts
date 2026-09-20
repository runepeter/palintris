import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServices } from '../../scenes/services';

afterEach(() => vi.unstubAllGlobals());

describe('lagring i nettleseren', () => {
  it('starter og beholder fremgang i minnet når localStorage er blokkert', () => {
    vi.stubGlobal('window', Object.defineProperty({}, 'localStorage', {
      get: () => { throw new DOMException('Access denied', 'SecurityError'); },
    }));
    vi.stubGlobal('Worker', class {
      onmessage = null;
      postMessage(): void {}
    });

    const services = createServices();
    services.store.setSettings({ music: false });
    services.store.update((data) => ({ ...data, blitz: { best: 7 } }));

    expect(services.settings().music).toBe(false);
    expect(services.store.data.blitz.best).toBe(7);
  });
});
