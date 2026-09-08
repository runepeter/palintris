import { describe, expect, it } from 'vitest';
import { audio } from '../sound';

describe('audio uten AudioContext (node)', () => {
  it('kaster ikke når lyd er av', () => {
    audio.configure({ sound: false, music: false });
    expect(() => audio.playSwap()).not.toThrow();
    expect(() => audio.startMusic('menu')).not.toThrow();
    expect(audio.isMusicPlaying()).toBe(false);
  });

  it('kaster ikke når lyd er på men AudioContext mangler', () => {
    audio.configure({ sound: true, music: true });
    expect(() => audio.playSwap()).not.toThrow();
    expect(() => audio.playSuccess()).not.toThrow();
    expect(() => audio.startMusic('gameplay')).not.toThrow();
    expect(audio.isMusicPlaying()).toBe(false);
  });

  it('music:false stopper musikk', () => {
    audio.configure({ sound: true, music: true });
    audio.startMusic('menu');
    audio.configure({ sound: true, music: false });
    expect(audio.isMusicPlaying()).toBe(false);
  });
});
