import Phaser from 'phaser';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// Vibrant, energetic color palette
export const COLORS = {
  // Backgrounds
  background: 0x0a0a1a,
  backgroundLight: 0x1a1a3a,
  backgroundGradientStart: 0x1a0a2e,
  backgroundGradientEnd: 0x0a1a2e,

  // Primary palette
  primary: 0x2a1a4a,
  secondary: 0x3a2a5a,
  tertiary: 0x4a3a6a,

  // Accent colors - vibrant neon
  accent: 0xff00ff,           // Magenta
  accentSecondary: 0x00ffff,  // Cyan
  accentTertiary: 0xffff00,   // Yellow

  // Status colors
  success: 0x00ff88,
  successLight: 0x88ffcc,
  warning: 0xffaa00,
  warningLight: 0xffcc66,
  error: 0xff3366,
  errorLight: 0xff6699,

  // Text
  text: 0xffffff,
  textMuted: 0xaaaacc,
  textDark: 0x1a1a2e,

  // Tile colors - more vibrant
  tile: {
    default: 0x2a2a4a,
    selected: 0xff00ff,
    highlight: 0x00ffff,
    palindrome: 0x00ff88,
    error: 0xff3366,
    hover: 0x4a4a6a,
    locked: 0x1a1a2a,
  },

  // Symbol colors - bright and distinct
  symbols: {
    letters: 0x00ffff,   // Cyan
    numbers: 0xffff00,   // Yellow
    shapes: 0xff00ff,    // Magenta
    colors: 0xff8800,    // Orange
    mixed: 0xffffff,     // White
  },

  // UI elements
  ui: {
    button: 0x3a2a5a,
    buttonHover: 0x5a4a7a,
    buttonActive: 0xff00ff,
    buttonDisabled: 0x2a2a3a,
    panel: 0x1a1a3a,
    panelBorder: 0xff00ff,
    progressBar: 0x00ff88,
    progressBarBg: 0x2a2a4a,
    badge: {
      bronze: 0xcd7f32,
      silver: 0xc0c0c0,
      gold: 0xffd700,
      platinum: 0xe5e4e2,
      diamond: 0xb9f2ff,
    },
  },

  // Difficulty colors
  difficulty: {
    tutorial: 0x00ff88,
    easy: 0x88ff00,
    medium: 0xffff00,
    hard: 0xff8800,
    expert: 0xff00ff,
  },

  // Rainbow for effects
  rainbow: [
    0xff0000,  // Red
    0xff8800,  // Orange
    0xffff00,  // Yellow
    0x00ff00,  // Green
    0x00ffff,  // Cyan
    0x0088ff,  // Blue
    0xff00ff,  // Magenta
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
