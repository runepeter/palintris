import { loadSettings } from './storage';

// Simple audio manager using Web Audio API
class AudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;

  private initContext(): void {
    if (this.audioContext !== null) return;

    try {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.3;

      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.connect(this.audioContext.destination);
      this.musicGainNode.gain.value = 0.1;
    } catch {
      // Audio not supported
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3
  ): void {
    const settings = loadSettings();
    if (!settings.soundEnabled) return;

    this.initContext();
    if (this.audioContext === null || this.gainNode === null) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      this.audioContext.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(this.gainNode);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  public playClick(): void {
    this.playTone(800, 0.05, 'square', 0.1);
  }

  public playSelect(): void {
    this.playTone(600, 0.1, 'sine', 0.2);
  }

  public playSwap(): void {
    this.playTone(400, 0.15, 'triangle', 0.2);
    setTimeout(() => this.playTone(500, 0.1, 'triangle', 0.15), 100);
  }

  public playRotate(): void {
    this.playTone(300, 0.1, 'sine', 0.15);
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.15), 50);
    setTimeout(() => this.playTone(500, 0.1, 'sine', 0.15), 100);
  }

  public playMirror(): void {
    this.playTone(500, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(500, 0.1, 'sine', 0.2), 150);
  }

  public playSuccess(): void {
    this.playTone(523, 0.15, 'sine', 0.3); // C5
    setTimeout(() => this.playTone(659, 0.15, 'sine', 0.3), 100); // E5
    setTimeout(() => this.playTone(784, 0.2, 'sine', 0.3), 200); // G5
    setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.25), 350); // C6
  }

  public playFailure(): void {
    this.playTone(300, 0.2, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(250, 0.3, 'sawtooth', 0.15), 150);
  }

  public playPalindrome(): void {
    this.playTone(700, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(900, 0.15, 'sine', 0.25), 80);
  }

  public playAchievement(): void {
    const notes = [523, 659, 784, 880, 1047]; // C5 E5 G5 A5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.25), i * 100);
    });
  }

  public playUndo(): void {
    this.playTone(400, 0.1, 'triangle', 0.15);
    setTimeout(() => this.playTone(300, 0.1, 'triangle', 0.1), 50);
  }

  public playError(): void {
    this.playTone(200, 0.15, 'sawtooth', 0.15);
  }
}

export const audio = new AudioManager();
