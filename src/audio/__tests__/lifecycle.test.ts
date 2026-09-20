import { afterEach, describe, expect, it, vi } from 'vitest';

class AudioNodeStub {
  readonly gain = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
  readonly frequency = this.gain;
  onended: (() => void) | null = null;
  connectedTo: AudioNodeStub | null = null;
  stopCalls = 0;
  disconnected = false;

  connect(node: AudioNodeStub): void { this.connectedTo = node; }
  disconnect(): void { this.disconnected = true; }
  start(): void {}
  stop(): void { this.stopCalls++; }
}

const oscillators: AudioNodeStub[] = [];

class AudioContextStub {
  currentTime = 0;
  sampleRate = 8;
  destination = new AudioNodeStub();
  createGain(): AudioNodeStub { return new AudioNodeStub(); }
  createOscillator(): AudioNodeStub {
    const oscillator = new AudioNodeStub();
    oscillators.push(oscillator);
    return oscillator;
  }
  createBuffer(): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(4) };
  }
  createBufferSource(): AudioNodeStub { return new AudioNodeStub(); }
  createBiquadFilter(): AudioNodeStub { return new AudioNodeStub(); }
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  oscillators.length = 0;
});

describe('musikkens lydnoder', () => {
  it('frigjør avsluttede toner mens musikken fortsetter', async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.stubGlobal('AudioContext', AudioContextStub);
    const { audio } = await import('../sound');
    audio.startMusic('menu');
    vi.advanceTimersByTime(125);
    expect(oscillators.length).toBeGreaterThan(0);
    const finished = [...oscillators];
    for (const oscillator of finished) oscillator.onended?.();

    expect(finished.every((oscillator) => oscillator.disconnected)).toBe(true);
    expect(finished.every((oscillator) => oscillator.connectedTo?.disconnected)).toBe(true);
    expect(audio.isMusicPlaying()).toBe(true);

    vi.advanceTimersByTime(500);
    const active = oscillators.slice(finished.length);
    expect(active.length).toBeGreaterThan(0);
    audio.stopMusic();
    expect(finished.every((oscillator) => oscillator.stopCalls === 1)).toBe(true);
    expect(active.every((oscillator) => oscillator.stopCalls === 2)).toBe(true);
  });
});
