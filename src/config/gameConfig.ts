import Phaser from 'phaser';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Refined, professional color palette with subtle elegance
export const COLORS = {
  // Backgrounds - deeper, richer tones
  background: 0x0d1117,
  backgroundLight: 0x161b22,
  backgroundGradientStart: 0x0d1117,
  backgroundGradientEnd: 0x1a1f2e,

  // Primary palette - sophisticated dark tones
  primary: 0x21262d,
  secondary: 0x30363d,
  tertiary: 0x484f58,

  // Accent colors - refined, less saturated
  accent: 0x58a6ff,           // Soft blue (primary accent)
  accentSecondary: 0x7ee787,  // Soft green
  accentTertiary: 0xffa657,   // Warm amber

  // Status colors - easier on eyes
  success: 0x3fb950,
  successLight: 0x56d364,
  warning: 0xd29922,
  warningLight: 0xe3b341,
  error: 0xf85149,
  errorLight: 0xff7b72,

  // Text - better contrast hierarchy
  text: 0xf0f6fc,
  textMuted: 0x8b949e,
  textDark: 0x0d1117,

  // Tile colors - cohesive and calm
  tile: {
    default: 0x21262d,
    selected: 0x58a6ff,
    highlight: 0x7ee787,
    palindrome: 0x3fb950,
    error: 0xf85149,
    hover: 0x30363d,
    locked: 0x161b22,
  },

  // Symbol colors - distinguishable but harmonious
  symbols: {
    letters: 0x79c0ff,   // Light blue
    numbers: 0xffa657,   // Amber
    shapes: 0xd2a8ff,    // Lavender
    colors: 0xff7b72,    // Coral
    mixed: 0xf0f6fc,     // Off-white
  },

  // UI elements - consistent and clean
  ui: {
    button: 0x21262d,
    buttonHover: 0x30363d,
    buttonActive: 0x58a6ff,
    buttonDisabled: 0x161b22,
    panel: 0x161b22,
    panelBorder: 0x30363d,
    progressBar: 0x3fb950,
    progressBarBg: 0x21262d,
    badge: {
      bronze: 0xcd7f32,
      silver: 0xc0c0c0,
      gold: 0xffc83d,
      platinum: 0xe8e8e8,
      diamond: 0xa5d8ff,
    },
  },

  // Difficulty colors - clear progression
  difficulty: {
    tutorial: 0x7ee787,
    easy: 0x3fb950,
    medium: 0xd29922,
    hard: 0xffa657,
    expert: 0xf85149,
  },

  // Rainbow for effects - softer palette
  rainbow: [
    0xf85149,  // Soft red
    0xffa657,  // Amber
    0xd29922,  // Gold
    0x3fb950,  // Green
    0x58a6ff,  // Blue
    0xa5d8ff,  // Sky blue
    0xd2a8ff,  // Lavender
  ],
} as const;

export const TILE_SIZE = 60;
export const TILE_SPACING = 8;
export const TILE_BORDER_RADIUS = 10;

export const ANIMATION_DURATION = {
  swap: 250,
  rotate: 350,
  mirror: 300,
  insert: 200,
  delete: 200,
  replace: 200,
  highlight: 400,
  complete: 800,
  buttonHover: 100,
  modalOpen: 300,
  particleBurst: 600,
} as const;

export const FONTS = {
  primary: 'Arial',
  mono: 'Courier New',
} as const;

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  input: {
    mouse: true,
    touch: true,
  },
};

export const SCORING = {
  baseComplete: 1000,
  operationBonus: 100,      // Per unused operation
  timeBonus: 10,            // Per second remaining
  perfectBonus: 500,        // No mistakes
  streakMultiplier: 0.15,   // 15% per level in streak (increased from 10%)
  skipPenalty: 0.5,         // 50% score reduction when using skip
  difficultyMultiplier: {
    tutorial: 0.75,         // Increased from 0.5 - still rewarding for beginners
    easy: 1.25,             // Increased from 1.0 - better early progression
    medium: 1.75,           // Increased from 1.5 - noticeable jump
    hard: 2.5,              // Increased from 2.0 - real challenge rewards
    expert: 4.0,            // Increased from 3.0 - big payoff for mastery
  },
} as const;

export const STORAGE_KEYS = {
  gameState: 'palintris_gameState',
  settings: 'palintris_settings',
  achievements: 'palintris_achievements',
  powerUps: 'palintris_powerups',
  badges: 'palintris_badges',
  tokens: 'palintris_tokens',
  stats: 'palintris_stats',
} as const;

// Power-up timing
export const POWERUP_DURATION = {
  freezeTime: 10000,        // 10 seconds
  doublePoints: 0,          // Entire level
} as const;

// Game balance
export const GAME_BALANCE = {
  startingTokens: 50,
  startingHints: 5,
  skipCost: 25,             // Tokens to skip a level
  hintCost: 10,             // Tokens for a hint
  extraMoveCost: 20,        // Tokens for extra move
  extraTimeCost: 15,        // Tokens for extra time
} as const;

// Visual effects configuration
export const EFFECTS = {
  // Camera shake effects
  shake: {
    small: { intensity: 0.002, duration: 100 },    // Subtle shake for swaps
    medium: { intensity: 0.005, duration: 150 },   // Medium shake for rotates
    large: { intensity: 0.01, duration: 200 },     // Big shake for mirrors/success
  },
  // Flash overlay effects
  flash: {
    success: { color: 0x00ff88, alpha: 0.3, duration: 200 },
    failure: { color: 0xff3366, alpha: 0.4, duration: 300 },
    palindrome: { color: 0xffd700, alpha: 0.25, duration: 150 },
    powerup: { color: 0xff00ff, alpha: 0.35, duration: 180 },
  },
  // Slow motion timings
  slowMotion: {
    palindromeDetect: { factor: 0.3, duration: 400 },
    levelComplete: { factor: 0.5, duration: 300 },
  },
  // Zoom effects
  zoom: {
    success: { intensity: 1.08, duration: 400 },
    failure: { intensity: 0.95, duration: 300 },
  },
} as const;
