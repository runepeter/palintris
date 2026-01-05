import type { Difficulty } from '../types';

// Theme interface for extensible design system
export interface Theme {
  readonly name: string;
  readonly colors: ThemeColors;
  readonly gradients: ThemeGradients;
  readonly particles: ParticleConfig;
  readonly glow: GlowConfig;
}

export interface ThemeColors {
  readonly background: number;
  readonly backgroundGradientStart: number;
  readonly backgroundGradientEnd: number;
  readonly primary: number;
  readonly secondary: number;
  readonly accent: number;
  readonly accentSecondary: number;
  readonly success: number;
  readonly warning: number;
  readonly error: number;
  readonly text: number;
  readonly textMuted: number;
  readonly textDark: number;
  readonly tile: {
    readonly default: number;
    readonly selected: number;
    readonly highlight: number;
    readonly palindrome: number;
    readonly error: number;
    readonly hover: number;
  };
  readonly symbols: {
    readonly letters: number;
    readonly numbers: number;
    readonly shapes: number;
    readonly colors: number;
    readonly mixed: number;
  };
  readonly ui: {
    readonly button: number;
    readonly buttonHover: number;
    readonly buttonActive: number;
    readonly panelBg: number;
    readonly panelBorder: number;
    readonly progressBar: number;
    readonly progressBarBg: number;
  };
}

export interface ThemeGradients {
  readonly background: readonly [number, number];
  readonly button: readonly [number, number];
  readonly success: readonly [number, number];
  readonly error: readonly [number, number];
}

export interface ParticleConfig {
  readonly enabled: boolean;
  readonly successColors: readonly number[];
  readonly failureColors: readonly number[];
  readonly palindromeColors: readonly number[];
  readonly sparkleColors: readonly number[];
}

export interface GlowConfig {
  readonly enabled: boolean;
  readonly intensity: number;
  readonly color: number;
  readonly pulseSpeed: number;
}

// Neon Arcade Theme - Vibrant and energetic
export const NEON_THEME: Theme = {
  name: 'Neon Arcade',
  colors: {
    background: 0x0a0a1a,
    backgroundGradientStart: 0x1a0a2e,
    backgroundGradientEnd: 0x0a1a2e,
    primary: 0x2a1a4a,
    secondary: 0x3a2a5a,
    accent: 0xff00ff,
    accentSecondary: 0x00ffff,
    success: 0x00ff88,
    warning: 0xffff00,
    error: 0xff3366,
    text: 0xffffff,
    textMuted: 0xaaaacc,
    textDark: 0x1a1a2e,
    tile: {
      default: 0x2a2a4a,
      selected: 0xff00ff,
      highlight: 0x00ffff,
      palindrome: 0x00ff88,
      error: 0xff3366,
      hover: 0x4a4a6a,
    },
    symbols: {
      letters: 0x00ffff,
      numbers: 0xffff00,
      shapes: 0xff00ff,
      colors: 0xff8800,
      mixed: 0xffffff,
    },
    ui: {
      button: 0x3a2a5a,
      buttonHover: 0x5a4a7a,
      buttonActive: 0xff00ff,
      panelBg: 0x1a1a3a,
      panelBorder: 0xff00ff,
      progressBar: 0x00ff88,
      progressBarBg: 0x2a2a4a,
    },
  },
  gradients: {
    background: [0x1a0a2e, 0x0a1a2e],
    button: [0x5a2a8a, 0x2a5a8a],
    success: [0x00ff88, 0x00ffcc],
    error: [0xff3366, 0xff6633],
  },
  particles: {
    enabled: true,
    successColors: [0x00ff88, 0x88ff00, 0x00ffcc, 0xffff00],
    failureColors: [0xff3366, 0xff6633, 0xff0066],
    palindromeColors: [0xff00ff, 0x00ffff, 0xffff00, 0x00ff88],
    sparkleColors: [0xffffff, 0xffff88, 0x88ffff, 0xff88ff],
  },
  glow: {
    enabled: true,
    intensity: 0.8,
    color: 0xff00ff,
    pulseSpeed: 1000,
  },
};

// Sunset Theme - Warm and inviting
export const SUNSET_THEME: Theme = {
  name: 'Sunset',
  colors: {
    background: 0x1a0a0a,
    backgroundGradientStart: 0x2a1010,
    backgroundGradientEnd: 0x1a0a1a,
    primary: 0x3a2020,
    secondary: 0x4a3030,
    accent: 0xff6b35,
    accentSecondary: 0xf7c59f,
    success: 0x2ec4b6,
    warning: 0xffd166,
    error: 0xef476f,
    text: 0xffffff,
    textMuted: 0xccbbaa,
    textDark: 0x1a0a0a,
    tile: {
      default: 0x3a2525,
      selected: 0xff6b35,
      highlight: 0xf7c59f,
      palindrome: 0x2ec4b6,
      error: 0xef476f,
      hover: 0x5a4040,
    },
    symbols: {
      letters: 0xff6b35,
      numbers: 0xffd166,
      shapes: 0xef476f,
      colors: 0x2ec4b6,
      mixed: 0xf7c59f,
    },
    ui: {
      button: 0x4a3030,
      buttonHover: 0x6a4545,
      buttonActive: 0xff6b35,
      panelBg: 0x2a1515,
      panelBorder: 0xff6b35,
      progressBar: 0x2ec4b6,
      progressBarBg: 0x3a2525,
    },
  },
  gradients: {
    background: [0x2a1010, 0x1a0a1a],
    button: [0xff6b35, 0xf7c59f],
    success: [0x2ec4b6, 0x06d6a0],
    error: [0xef476f, 0xff6b6b],
  },
  particles: {
    enabled: true,
    successColors: [0x2ec4b6, 0x06d6a0, 0x00ffcc],
    failureColors: [0xef476f, 0xff6b6b, 0xff3366],
    palindromeColors: [0xff6b35, 0xffd166, 0xf7c59f, 0x2ec4b6],
    sparkleColors: [0xffffff, 0xffd166, 0xf7c59f],
  },
  glow: {
    enabled: true,
    intensity: 0.6,
    color: 0xff6b35,
    pulseSpeed: 1200,
  },
};

// Ocean Theme - Cool and calm
export const OCEAN_THEME: Theme = {
  name: 'Ocean',
  colors: {
    background: 0x0a1a2a,
    backgroundGradientStart: 0x0a2a3a,
    backgroundGradientEnd: 0x0a1a3a,
    primary: 0x1a3a5a,
    secondary: 0x2a4a6a,
    accent: 0x00b4d8,
    accentSecondary: 0x90e0ef,
    success: 0x06d6a0,
    warning: 0xffd166,
    error: 0xff6b6b,
    text: 0xffffff,
    textMuted: 0xaaccdd,
    textDark: 0x0a1a2a,
    tile: {
      default: 0x1a3a5a,
      selected: 0x00b4d8,
      highlight: 0x90e0ef,
      palindrome: 0x06d6a0,
      error: 0xff6b6b,
      hover: 0x2a5a7a,
    },
    symbols: {
      letters: 0x00b4d8,
      numbers: 0xffd166,
      shapes: 0x06d6a0,
      colors: 0x90e0ef,
      mixed: 0xffffff,
    },
    ui: {
      button: 0x2a4a6a,
      buttonHover: 0x3a6a8a,
      buttonActive: 0x00b4d8,
      panelBg: 0x0a2a3a,
      panelBorder: 0x00b4d8,
      progressBar: 0x06d6a0,
      progressBarBg: 0x1a3a5a,
    },
  },
  gradients: {
    background: [0x0a2a3a, 0x0a1a3a],
    button: [0x00b4d8, 0x90e0ef],
    success: [0x06d6a0, 0x00ffcc],
    error: [0xff6b6b, 0xff8888],
  },
  particles: {
    enabled: true,
    successColors: [0x06d6a0, 0x00ffcc, 0x90e0ef],
    failureColors: [0xff6b6b, 0xff8888, 0xffaaaa],
    palindromeColors: [0x00b4d8, 0x90e0ef, 0x06d6a0, 0xffd166],
    sparkleColors: [0xffffff, 0x90e0ef, 0xaaddff],
  },
  glow: {
    enabled: true,
    intensity: 0.5,
    color: 0x00b4d8,
    pulseSpeed: 1500,
  },
};

// Available themes
export const THEMES: Record<string, Theme> = {
  neon: NEON_THEME,
  sunset: SUNSET_THEME,
  ocean: OCEAN_THEME,
};

// Default theme
export const DEFAULT_THEME = NEON_THEME;

// Get theme colors for difficulty
export const getDifficultyColors = (
  difficulty: Difficulty,
  theme: Theme = DEFAULT_THEME
): { bg: number; accent: number; glow: number } => {
  switch (difficulty) {
    case 'tutorial':
      return { bg: 0x2a5a3a, accent: 0x00ff88, glow: 0x00ff88 };
    case 'easy':
      return { bg: 0x3a5a2a, accent: 0x88ff00, glow: 0x88ff00 };
    case 'medium':
      return { bg: 0x5a5a2a, accent: 0xffff00, glow: 0xffff00 };
    case 'hard':
      return { bg: 0x5a3a2a, accent: 0xff8800, glow: 0xff8800 };
    case 'expert':
      return { bg: 0x5a2a3a, accent: 0xff00ff, glow: 0xff00ff };
    default:
      return { bg: theme.colors.primary, accent: theme.colors.accent, glow: theme.colors.accent };
  }
};

// Rainbow color cycle for effects
export const RAINBOW_COLORS = [
  0xff0000, // Red
  0xff8800, // Orange
  0xffff00, // Yellow
  0x00ff00, // Green
  0x00ffff, // Cyan
  0x0088ff, // Blue
  0xff00ff, // Magenta
] as const;

// Get rainbow color at time t (0-1)
export const getRainbowColor = (t: number): number => {
  const index = Math.floor(t * RAINBOW_COLORS.length) % RAINBOW_COLORS.length;
  return RAINBOW_COLORS[index] ?? 0xffffff;
};

// Interpolate between two colors
export const lerpColor = (color1: number, color2: number, t: number): number => {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return (r << 16) | (g << 8) | b;
};
