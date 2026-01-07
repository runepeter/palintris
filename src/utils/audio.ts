import { loadSettings } from './storage';

// Note frequencies (Hz) - standard tuning
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51,
  // Sharps
  'C#3': 138.59, 'D#3': 155.56, 'F#3': 185.0, 'G#3': 207.65, 'A#3': 233.08,
  'C#4': 277.18, 'D#4': 311.13, 'F#4': 369.99, 'G#4': 415.3, 'A#4': 466.16,
  'C#5': 554.37, 'D#5': 622.25, 'F#5': 739.99, 'G#5': 830.61, 'A#5': 932.33,
} as const;

// Rest marker
const REST = 0;

// Pattern types for sequencer
interface NoteEvent {
  note: number; // frequency or REST
  duration: number; // in steps (1 step = 1/16 note)
}

interface Pattern {
  tempo: number; // BPM
  length: number; // total steps
  pulse1: NoteEvent[];
  pulse2: NoteEvent[];
  triangle: NoteEvent[];
  noise: NoteEvent[]; // frequency = pitch of noise, higher = more hi-hat like
}

// ============================================================================
// CHIPTUNE ENGINE - 4-channel NES-style music
// ============================================================================
class ChiptuneEngine {
  private isPlaying = false;
  private currentPattern: Pattern | null = null;
  private stepIndex = 0;
  private stepInterval: ReturnType<typeof setInterval> | null = null;
  private activeOscillators: OscillatorNode[] = [];

  constructor(private getContext: () => AudioContext | null, private getMasterGain: () => GainNode | null) {}

  private createNoiseBuffer(): AudioBuffer | null {
    const ctx = this.getContext();
    if (!ctx) return null;

    const bufferSize = ctx.sampleRate * 0.5; // 0.5 second buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private playNote(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    const ctx = this.getContext();
    const master = this.getMasterGain();
    if (!ctx || !master || frequency === REST) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // NES-style envelope: quick attack, sustain, quick release
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.setValueAtTime(volume, now + duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(now);
    osc.stop(now + duration);
    this.activeOscillators.push(osc);
  }

  private playNoiseDrum(pitch: number, duration: number, volume: number): void {
    const ctx = this.getContext();
    const master = this.getMasterGain();
    if (!ctx || !master || pitch === REST) return;

    const buffer = this.createNoiseBuffer();
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(pitch * 50, ctx.currentTime); // Higher pitch = more hi-hat

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);

    source.start(now);
    source.stop(now + duration);
  }

  public play(patternName: string): void {
    const settings = loadSettings();
    if (!settings.musicEnabled) return;

    const pattern = PATTERNS[patternName];
    if (!pattern) return;

    this.stop();
    this.currentPattern = pattern;
    this.stepIndex = 0;
    this.isPlaying = true;

    const stepDuration = 60 / pattern.tempo / 4; // 16th note duration in seconds

    this.stepInterval = setInterval(() => {
      this.processStep(stepDuration);
    }, stepDuration * 1000);
  }

  private processStep(stepDuration: number): void {
    if (!this.currentPattern || !this.isPlaying) return;

    const pattern = this.currentPattern;

    // Find notes that start at this step
    let currentPos = 0;
    for (const event of pattern.pulse1) {
      if (currentPos === this.stepIndex) {
        this.playNote(event.note, stepDuration * event.duration * 0.9, 'square', 0.08);
        break;
      }
      currentPos += event.duration;
      if (currentPos > this.stepIndex) break;
    }

    currentPos = 0;
    for (const event of pattern.pulse2) {
      if (currentPos === this.stepIndex) {
        this.playNote(event.note, stepDuration * event.duration * 0.9, 'square', 0.06);
        break;
      }
      currentPos += event.duration;
      if (currentPos > this.stepIndex) break;
    }

    currentPos = 0;
    for (const event of pattern.triangle) {
      if (currentPos === this.stepIndex) {
        this.playNote(event.note, stepDuration * event.duration * 0.95, 'triangle', 0.1);
        break;
      }
      currentPos += event.duration;
      if (currentPos > this.stepIndex) break;
    }

    currentPos = 0;
    for (const event of pattern.noise) {
      if (currentPos === this.stepIndex) {
        this.playNoiseDrum(event.note, stepDuration * event.duration * 0.5, 0.15);
        break;
      }
      currentPos += event.duration;
      if (currentPos > this.stepIndex) break;
    }

    this.stepIndex = (this.stepIndex + 1) % pattern.length;
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    this.activeOscillators.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.activeOscillators = [];
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

// ============================================================================
// MUSIC PATTERNS - Hair metal inspired 8-bit tracks
// ============================================================================
const PATTERNS: Record<string, Pattern> = {
  // Menu theme - Chill synthwave vibe, 120 BPM
  menu: {
    tempo: 120,
    length: 64, // 4 bars
    // Melodic arpeggio pattern
    pulse1: [
      { note: NOTES.E4, duration: 2 }, { note: NOTES.G4, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: NOTES.E5, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: NOTES.G4, duration: 2 },
      { note: NOTES.E4, duration: 2 }, { note: REST, duration: 2 },
      // Bar 2
      { note: NOTES.D4, duration: 2 }, { note: NOTES.G4, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: NOTES.D5, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: NOTES.G4, duration: 2 },
      { note: NOTES.D4, duration: 2 }, { note: REST, duration: 2 },
      // Bar 3
      { note: NOTES.C4, duration: 2 }, { note: NOTES.E4, duration: 2 },
      { note: NOTES.G4, duration: 2 }, { note: NOTES.C5, duration: 2 },
      { note: NOTES.G4, duration: 2 }, { note: NOTES.E4, duration: 2 },
      { note: NOTES.C4, duration: 2 }, { note: REST, duration: 2 },
      // Bar 4
      { note: NOTES.D4, duration: 2 }, { note: NOTES['F#4'], duration: 2 },
      { note: NOTES.A4, duration: 2 }, { note: NOTES.D5, duration: 2 },
      { note: NOTES.A4, duration: 2 }, { note: NOTES['F#4'], duration: 2 },
      { note: NOTES.D4, duration: 2 }, { note: REST, duration: 2 },
    ],
    // Harmony pad
    pulse2: [
      { note: NOTES.E3, duration: 16 },
      { note: NOTES.G3, duration: 16 },
      { note: NOTES.C4, duration: 16 },
      { note: NOTES.D4, duration: 16 },
    ],
    // Bass line
    triangle: [
      { note: NOTES.E3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.E3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.G3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.G3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.C3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.C3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.D3, duration: 4 }, { note: REST, duration: 4 },
      { note: NOTES.D3, duration: 4 }, { note: REST, duration: 4 },
    ],
    // Subtle hi-hat
    noise: [
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
      { note: 8, duration: 4 }, { note: REST, duration: 4 },
    ],
  },

  // Gameplay theme - Hair metal anthem, 136 BPM
  gameplay: {
    tempo: 136,
    length: 64, // 4 bars
    // Lead melody - anthemic, Bon Jovi style
    pulse1: [
      // Bar 1 - Power intro
      { note: NOTES.E5, duration: 2 }, { note: NOTES.E5, duration: 2 },
      { note: NOTES.D5, duration: 2 }, { note: NOTES.E5, duration: 2 },
      { note: NOTES.G5, duration: 4 }, { note: NOTES.E5, duration: 4 },
      // Bar 2
      { note: NOTES.D5, duration: 2 }, { note: NOTES.D5, duration: 2 },
      { note: NOTES.C5, duration: 2 }, { note: NOTES.D5, duration: 2 },
      { note: NOTES.E5, duration: 4 }, { note: REST, duration: 4 },
      // Bar 3 - Build up
      { note: NOTES.E5, duration: 2 }, { note: NOTES.G5, duration: 2 },
      { note: NOTES.A5, duration: 4 }, { note: NOTES.G5, duration: 4 },
      { note: NOTES.E5, duration: 4 },
      // Bar 4 - Climax
      { note: NOTES.A5, duration: 4 }, { note: NOTES.G5, duration: 2 },
      { note: NOTES.E5, duration: 2 }, { note: NOTES.D5, duration: 4 },
      { note: REST, duration: 4 },
    ],
    // Power chord harmony
    pulse2: [
      // E power chord
      { note: NOTES.B4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.B4, duration: 2 }, { note: REST, duration: 2 },
      // D power chord
      { note: NOTES.A4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.A4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.A4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.A4, duration: 2 }, { note: REST, duration: 2 },
      // C power chord
      { note: NOTES.G4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.G4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.G4, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.G4, duration: 2 }, { note: REST, duration: 2 },
      // G power chord
      { note: NOTES.D5, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.D5, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.D5, duration: 2 }, { note: REST, duration: 2 },
      { note: NOTES.D5, duration: 2 }, { note: REST, duration: 2 },
    ],
    // Driving bass - root notes
    triangle: [
      // E bass
      { note: NOTES.E3, duration: 2 }, { note: NOTES.E3, duration: 2 },
      { note: NOTES.E3, duration: 2 }, { note: NOTES.E3, duration: 2 },
      { note: NOTES.E3, duration: 2 }, { note: NOTES.E3, duration: 2 },
      { note: NOTES.E3, duration: 2 }, { note: NOTES.E3, duration: 2 },
      // D bass
      { note: NOTES.D3, duration: 2 }, { note: NOTES.D3, duration: 2 },
      { note: NOTES.D3, duration: 2 }, { note: NOTES.D3, duration: 2 },
      { note: NOTES.D3, duration: 2 }, { note: NOTES.D3, duration: 2 },
      { note: NOTES.D3, duration: 2 }, { note: NOTES.D3, duration: 2 },
      // C bass
      { note: NOTES.C3, duration: 2 }, { note: NOTES.C3, duration: 2 },
      { note: NOTES.C3, duration: 2 }, { note: NOTES.C3, duration: 2 },
      { note: NOTES.C3, duration: 2 }, { note: NOTES.C3, duration: 2 },
      { note: NOTES.C3, duration: 2 }, { note: NOTES.C3, duration: 2 },
      // G bass
      { note: NOTES.G3, duration: 2 }, { note: NOTES.G3, duration: 2 },
      { note: NOTES.G3, duration: 2 }, { note: NOTES.G3, duration: 2 },
      { note: NOTES.G3, duration: 2 }, { note: NOTES.G3, duration: 2 },
      { note: NOTES.G3, duration: 2 }, { note: NOTES.G3, duration: 2 },
    ],
    // Driving rock drums - kick on 1&3, snare on 2&4, constant hi-hat
    noise: [
      // Bar 1
      { note: 2, duration: 2 }, { note: 10, duration: 2 }, // kick, hi-hat
      { note: 5, duration: 2 }, { note: 10, duration: 2 }, // snare, hi-hat
      { note: 2, duration: 2 }, { note: 10, duration: 2 }, // kick, hi-hat
      { note: 5, duration: 2 }, { note: 10, duration: 2 }, // snare, hi-hat
      // Bar 2
      { note: 2, duration: 2 }, { note: 10, duration: 2 },
      { note: 5, duration: 2 }, { note: 10, duration: 2 },
      { note: 2, duration: 2 }, { note: 10, duration: 2 },
      { note: 5, duration: 2 }, { note: 10, duration: 2 },
      // Bar 3
      { note: 2, duration: 2 }, { note: 10, duration: 2 },
      { note: 5, duration: 2 }, { note: 10, duration: 2 },
      { note: 2, duration: 2 }, { note: 10, duration: 2 },
      { note: 5, duration: 2 }, { note: 10, duration: 2 },
      // Bar 4 - fill
      { note: 2, duration: 2 }, { note: 10, duration: 2 },
      { note: 5, duration: 1 }, { note: 5, duration: 1 }, { note: 5, duration: 1 }, { note: 5, duration: 1 },
      { note: 2, duration: 2 }, { note: 5, duration: 1 }, { note: 5, duration: 1 },
      { note: 2, duration: 1 }, { note: 2, duration: 1 }, { note: 5, duration: 2 },
    ],
  },
};

// ============================================================================
// AUDIO MANAGER - Enhanced 8-bit sound effects
// ============================================================================
class AudioManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private chiptuneEngine: ChiptuneEngine;

  constructor() {
    this.chiptuneEngine = new ChiptuneEngine(
      () => this.audioContext,
      () => this.musicGainNode
    );
  }

  private initContext(): void {
    if (this.audioContext !== null) return;

    try {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.3;

      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.connect(this.audioContext.destination);
      this.musicGainNode.gain.value = 0.12;
    } catch {
      // Audio not supported
    }
  }

  // Basic tone with envelope
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.2
  ): void {
    const settings = loadSettings();
    if (!settings.soundEnabled) return;

    this.initContext();
    if (this.audioContext === null || this.gainNode === null) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start();
    osc.stop(now + duration);
  }

  // Pitch sweep for 8-bit character
  private playSweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume = 0.2
  ): void {
    const settings = loadSettings();
    if (!settings.soundEnabled) return;

    this.initContext();
    if (this.audioContext === null || this.gainNode === null) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    const now = this.audioContext.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.8);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.start();
    osc.stop(now + duration);
  }

  // Fast arpeggio for 8-bit chord feel
  private playArpeggio(
    frequencies: number[],
    noteDuration: number,
    type: OscillatorType = 'square',
    volume = 0.15
  ): void {
    frequencies.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, noteDuration * 1.2, type, volume), i * noteDuration * 1000);
    });
  }

  // Noise burst for percussion
  private playNoise(duration: number, pitch: number, volume = 0.15): void {
    const settings = loadSettings();
    if (!settings.soundEnabled) return;

    this.initContext();
    if (this.audioContext === null || this.gainNode === null) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(pitch, this.audioContext.currentTime);

    const gain = this.audioContext.createGain();
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);

    source.start();
    source.stop(now + duration);
  }

  // ========== SOUND EFFECTS ==========

  // UI click - quick blip with noise
  public playClick(): void {
    this.playSweep(1200, 600, 0.04, 'square', 0.08);
    this.playNoise(0.02, 2000, 0.04);
  }

  // Tile selection - cheerful arpeggio
  public playSelect(): void {
    this.playArpeggio([NOTES.C5, NOTES.E5, NOTES.G5], 0.04, 'square', 0.12);
  }

  // Swap operation - two-note glissando
  public playSwap(): void {
    this.playSweep(NOTES.C4, NOTES.G4, 0.1, 'square', 0.15);
    setTimeout(() => this.playSweep(NOTES.G4, NOTES.C5, 0.1, 'square', 0.12), 80);
  }

  // Rotate operation - rising arpeggio
  public playRotate(): void {
    this.playArpeggio([NOTES.E4, NOTES.G4, NOTES.B4, NOTES.E5], 0.035, 'square', 0.12);
  }

  // Mirror operation - symmetrical up-down pattern
  public playMirror(): void {
    this.playArpeggio([NOTES.C5, NOTES.E5, NOTES.G5], 0.03, 'square', 0.1);
    setTimeout(() => {
      this.playArpeggio([NOTES.G5, NOTES.E5, NOTES.C5], 0.03, 'square', 0.1);
    }, 120);
  }

  // Success - triumphant fanfare with power chord feel
  public playSuccess(): void {
    // Power chord arpeggio
    this.playArpeggio([NOTES.C4, NOTES.G4, NOTES.C5], 0.06, 'square', 0.15);
    setTimeout(() => {
      this.playArpeggio([NOTES.E4, NOTES.B4, NOTES.E5], 0.06, 'square', 0.15);
    }, 200);
    setTimeout(() => {
      this.playArpeggio([NOTES.G4, NOTES.D5, NOTES.G5], 0.06, 'square', 0.18);
    }, 400);
    // Final triumphant note
    setTimeout(() => {
      this.playTone(NOTES.C6, 0.4, 'square', 0.2);
      this.playTone(NOTES.G5, 0.4, 'square', 0.15);
      this.playTone(NOTES.E5, 0.4, 'square', 0.12);
    }, 600);
  }

  // Failure - descending chromatic with buzz
  public playFailure(): void {
    this.playSweep(400, 100, 0.3, 'sawtooth', 0.15);
    this.playNoise(0.15, 200, 0.1);
  }

  // Palindrome detected - quick triumphant sound
  public playPalindrome(): void {
    this.playArpeggio([NOTES.G4, NOTES.B4, NOTES.D5, NOTES.G5], 0.04, 'square', 0.15);
  }

  // Achievement unlocked - full fanfare
  public playAchievement(): void {
    const fanfare = [NOTES.C5, NOTES.E5, NOTES.G5, NOTES.C6, NOTES.E6];
    fanfare.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 'square', 0.18);
        // Add harmony
        if (i > 0) {
          this.playTone(freq * 0.75, 0.15, 'square', 0.1);
        }
      }, i * 80);
    });
    // Drum roll
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playNoise(0.05, 1000, 0.08), i * 80);
    }
  }

  // Undo operation - quick descending
  public playUndo(): void {
    this.playSweep(NOTES.G4, NOTES.C4, 0.08, 'triangle', 0.12);
  }

  // Error - harsh buzz
  public playError(): void {
    this.playTone(120, 0.15, 'sawtooth', 0.12);
    this.playNoise(0.1, 150, 0.08);
  }

  // ========== MUSIC CONTROL ==========

  public startMusic(track: 'menu' | 'gameplay'): void {
    this.initContext();
    this.chiptuneEngine.play(track);
  }

  public stopMusic(): void {
    this.chiptuneEngine.stop();
  }

  public isMusicPlaying(): boolean {
    return this.chiptuneEngine.isCurrentlyPlaying();
  }

  // Play victory jingle (short, doesn't loop)
  public playVictoryJingle(): void {
    const settings = loadSettings();
    if (!settings.musicEnabled) return;

    this.initContext();

    // Hair metal victory fanfare
    const melody = [
      { note: NOTES.E5, delay: 0 },
      { note: NOTES.G5, delay: 100 },
      { note: NOTES.B5, delay: 200 },
      { note: NOTES.E6, delay: 350 },
      { note: NOTES.D6, delay: 500 },
      { note: NOTES.E6, delay: 650 },
    ];

    melody.forEach(({ note, delay }) => {
      setTimeout(() => this.playTone(note, 0.2, 'square', 0.18), delay);
    });

    // Power chord backing
    setTimeout(() => {
      this.playTone(NOTES.E4, 0.6, 'square', 0.1);
      this.playTone(NOTES.B4, 0.6, 'square', 0.08);
    }, 0);

    // Drum hits
    setTimeout(() => this.playNoise(0.1, 200, 0.15), 0);
    setTimeout(() => this.playNoise(0.1, 200, 0.15), 350);
    setTimeout(() => this.playNoise(0.15, 150, 0.2), 650);
  }
}

export const audio = new AudioManager();
