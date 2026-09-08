import { describe, expect, it } from 'vitest';
import { audio, transposedFrequency } from '../sound';

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

  it('kaster ikke med transpose og tempoScale', () => {
    audio.configure({ sound: true, music: true });
    expect(() => audio.startMusic('gameplay', { transpose: 4, tempoScale: 1.2 })).not.toThrow();
    expect(audio.isMusicPlaying()).toBe(false);
  });
});

describe('transposedFrequency', () => {
  it('dobler frekvensen én oktav opp', () => {
    expect(transposedFrequency(440, 12)).toBeCloseTo(880);
  });

  it('halverer frekvensen én oktav ned', () => {
    expect(transposedFrequency(440, -12)).toBeCloseTo(220);
  });

  it('lar hvile (0) forbli hvile', () => {
    expect(transposedFrequency(0, 7)).toBe(0);
  });
});
