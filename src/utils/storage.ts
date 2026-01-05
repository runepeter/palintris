import type { GameState, GameSettings, PlayerProgress } from '../types';
import { STORAGE_KEYS, GAME_BALANCE } from '../config/gameConfig';
import type { PowerUpInventory } from '../game/PowerUps';
import { createStarterInventory } from '../game/PowerUps';
import type { BadgeProgress } from '../game/BadgeSystem';
import { createEmptyBadgeProgress } from '../game/BadgeSystem';

// Extended game state with tokens and stats
export interface ExtendedGameState extends GameState {
  tokens: number;
  winStreak: number;
  totalPlayTime: number;
  palindromesFound: number;
  powerUpsUsed: number;
  hintsUsed: number;
  perfectLevels: number;
  fastCompletions: number;
  daysPlayed: string[];
  lastPlayDate: string;
}

const DEFAULT_GAME_STATE: ExtendedGameState = {
  currentLevel: 1,
  totalScore: 0,
  levelsCompleted: [],
  achievements: [],
  highScores: {},
  tokens: GAME_BALANCE.startingTokens,
  winStreak: 0,
  totalPlayTime: 0,
  palindromesFound: 0,
  powerUpsUsed: 0,
  hintsUsed: 0,
  perfectLevels: 0,
  fastCompletions: 0,
  daysPlayed: [],
  lastPlayDate: '',
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  particlesEnabled: true,
  colorBlindMode: false,
};

/**
 * Save game state to localStorage
 */
export const saveGameState = (state: ExtendedGameState): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.gameState, JSON.stringify(state));
  } catch {
    // Storage might be full or disabled
  }
};

/**
 * Load game state from localStorage
 */
export const loadGameState = (): ExtendedGameState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.gameState);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as Partial<ExtendedGameState>;
      // Merge with defaults to handle new fields
      return { ...DEFAULT_GAME_STATE, ...parsed };
    }
  } catch {
    // Invalid data, return default
  }
  return { ...DEFAULT_GAME_STATE };
};

/**
 * Save settings to localStorage
 */
export const saveSettings = (settings: GameSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    // Storage might be full or disabled
  }
};

/**
 * Load settings from localStorage
 */
export const loadSettings = (): GameSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.settings);
    if (stored !== null) {
      return JSON.parse(stored) as GameSettings;
    }
  } catch {
    // Invalid data, return default
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * Save power-up inventory
 */
export const savePowerUps = (inventory: PowerUpInventory): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.powerUps, JSON.stringify(inventory));
  } catch {
    // Storage might be full or disabled
  }
};

/**
 * Load power-up inventory
 */
export const loadPowerUps = (): PowerUpInventory => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.powerUps);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as Partial<PowerUpInventory>;
      return { ...createStarterInventory(), ...parsed };
    }
  } catch {
    // Invalid data
  }
  return createStarterInventory();
};

/**
 * Save badge progress
 */
export const saveBadgeProgress = (progress: BadgeProgress): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.badges, JSON.stringify(progress));
  } catch {
    // Storage might be full or disabled
  }
};

/**
 * Load badge progress
 */
export const loadBadgeProgress = (): BadgeProgress => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.badges);
    if (stored !== null) {
      const parsed = JSON.parse(stored) as Partial<BadgeProgress>;
      return { ...createEmptyBadgeProgress(), ...parsed };
    }
  } catch {
    // Invalid data
  }
  return createEmptyBadgeProgress();
};

/**
 * Load complete player progress
 */
export const loadPlayerProgress = (): PlayerProgress => {
  return {
    gameState: loadGameState(),
    settings: loadSettings(),
  };
};

/**
 * Save complete player progress
 */
export const savePlayerProgress = (progress: PlayerProgress): void => {
  saveGameState(progress.gameState as ExtendedGameState);
  saveSettings(progress.settings);
};

/**
 * Reset all progress
 */
export const resetProgress = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // Ignore errors
  }
};

/**
 * Update high score for a level
 */
export const updateHighScore = (levelId: number, score: number): boolean => {
  const state = loadGameState();
  const currentHigh = state.highScores[levelId] ?? 0;

  if (score > currentHigh) {
    state.highScores[levelId] = score;
    saveGameState(state);
    return true;
  }

  return false;
};

/**
 * Mark a level as completed
 */
export const markLevelCompleted = (levelId: number): void => {
  const state = loadGameState();

  if (!state.levelsCompleted.includes(levelId)) {
    state.levelsCompleted.push(levelId);
    state.winStreak++;
    saveGameState(state);
  }
};

/**
 * Mark a level as skipped (still unlocks next level)
 */
export const markLevelSkipped = (levelId: number): void => {
  const state = loadGameState();

  if (!state.levelsCompleted.includes(levelId)) {
    state.levelsCompleted.push(levelId);
    state.winStreak = 0; // Reset streak when skipping
    saveGameState(state);
  }
};

/**
 * Add achievement
 */
export const addAchievement = (achievementId: string): boolean => {
  const state = loadGameState();

  if (!state.achievements.includes(achievementId)) {
    state.achievements.push(achievementId);
    saveGameState(state);
    return true;
  }

  return false;
};

/**
 * Add to total score
 */
export const addScore = (points: number): number => {
  const state = loadGameState();
  state.totalScore += points;
  saveGameState(state);
  return state.totalScore;
};

/**
 * Add tokens
 */
export const addTokens = (amount: number): number => {
  const state = loadGameState();
  state.tokens += amount;
  saveGameState(state);
  return state.tokens;
};

/**
 * Spend tokens (returns true if successful)
 */
export const spendTokens = (amount: number): boolean => {
  const state = loadGameState();
  if (state.tokens >= amount) {
    state.tokens -= amount;
    saveGameState(state);
    return true;
  }
  return false;
};

/**
 * Get current token balance
 */
export const getTokens = (): number => {
  return loadGameState().tokens;
};

/**
 * Use a power-up from inventory
 */
export const usePowerUp = (type: keyof PowerUpInventory): boolean => {
  const inventory = loadPowerUps();
  if (inventory[type] > 0) {
    inventory[type]--;
    savePowerUps(inventory);

    // Track usage
    const state = loadGameState();
    state.powerUpsUsed++;
    saveGameState(state);

    return true;
  }
  return false;
};

/**
 * Add power-ups to inventory
 */
export const addPowerUp = (type: keyof PowerUpInventory, count: number = 1): void => {
  const inventory = loadPowerUps();
  inventory[type] += count;
  savePowerUps(inventory);
};

/**
 * Track play session
 */
export const trackPlaySession = (durationMs: number): void => {
  const state = loadGameState();
  state.totalPlayTime += durationMs;

  // Track unique days played
  const today = new Date().toISOString().split('T')[0];
  if (today !== undefined && !state.daysPlayed.includes(today)) {
    state.daysPlayed.push(today);
  }
  state.lastPlayDate = today ?? '';

  saveGameState(state);
};

/**
 * Increment palindromes found
 */
export const incrementPalindromesFound = (): void => {
  const state = loadGameState();
  state.palindromesFound++;
  saveGameState(state);
};

/**
 * Track perfect level completion
 */
export const trackPerfectLevel = (): void => {
  const state = loadGameState();
  state.perfectLevels++;
  saveGameState(state);
};

/**
 * Track fast completion
 */
export const trackFastCompletion = (): void => {
  const state = loadGameState();
  state.fastCompletions++;
  saveGameState(state);
};

/**
 * Reset win streak
 */
export const resetWinStreak = (): void => {
  const state = loadGameState();
  state.winStreak = 0;
  saveGameState(state);
};

/**
 * Award badge and tokens
 */
export const awardBadge = (badgeId: string, tokenReward: number): boolean => {
  const progress = loadBadgeProgress();

  if (!progress.earnedBadges.includes(badgeId)) {
    progress.earnedBadges.push(badgeId);
    progress.totalTokensEarned += tokenReward;
    saveBadgeProgress(progress);

    // Add tokens to player
    addTokens(tokenReward);
    return true;
  }

  return false;
};

/**
 * Update badge progress
 */
export const updateBadgeProgress = (type: string, value: number): void => {
  const progress = loadBadgeProgress();
  progress.progress[type] = Math.max(progress.progress[type] ?? 0, value);
  saveBadgeProgress(progress);
};
