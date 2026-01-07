/**
 * Daily Challenge Configuration
 * Defines difficulty progression, streak rewards, and time limits
 */

export interface DailyChallengeConfig {
  /** Difficulty mapped by day of week (0 = Sunday, 6 = Saturday) */
  difficultyByDayOfWeek: Record<number, 'easy' | 'medium' | 'hard'>;

  /** Token rewards for consecutive day streaks */
  streakBonusTokens: number[];

  /** Time limit range in seconds */
  timeLimitRange: { min: number; max: number };

  /** Completion rewards */
  rewards: {
    baseTokens: number; // Base reward for completing
    difficultyMultiplier: Record<'easy' | 'medium' | 'hard', number>;
  };
}

export const DAILY_CHALLENGE_CONFIG: DailyChallengeConfig = {
  difficultyByDayOfWeek: {
    0: 'easy', // Sunday - Weekend easy
    1: 'medium', // Monday - Start of week
    2: 'hard', // Tuesday - Midweek challenge
    3: 'hard', // Wednesday - Peak difficulty
    4: 'medium', // Thursday - Winding down
    5: 'medium', // Friday - TGIF
    6: 'easy', // Saturday - Weekend easy
  },

  // Streak bonuses: [1 day, 2 days, 3 days, 5 days, 7+ days]
  streakBonusTokens: [10, 20, 30, 50, 100],

  timeLimitRange: {
    min: 60, // 1 minute minimum
    max: 180, // 3 minutes maximum
  },

  rewards: {
    baseTokens: 25, // Base reward for any completion
    difficultyMultiplier: {
      easy: 1.0,
      medium: 1.5,
      hard: 2.0,
    },
  },
};

/**
 * Calculate streak bonus tokens based on consecutive days
 */
export function getStreakBonus(streakDays: number): number {
  if (streakDays <= 0) return 0;
  if (streakDays === 1) return DAILY_CHALLENGE_CONFIG.streakBonusTokens[0] ?? 0;
  if (streakDays === 2) return DAILY_CHALLENGE_CONFIG.streakBonusTokens[1] ?? 0;
  if (streakDays === 3) return DAILY_CHALLENGE_CONFIG.streakBonusTokens[2] ?? 0;
  if (streakDays >= 4 && streakDays < 7)
    return DAILY_CHALLENGE_CONFIG.streakBonusTokens[3] ?? 0;
  return DAILY_CHALLENGE_CONFIG.streakBonusTokens[4] ?? 0; // 7+ days
}

/**
 * Calculate total tokens earned for a daily challenge completion
 */
export function calculateDailyChallengeReward(
  difficulty: 'easy' | 'medium' | 'hard',
  _score: number,
  streakDays: number
): { baseTokens: number; streakBonus: number; total: number } {
  const baseTokens = Math.round(
    DAILY_CHALLENGE_CONFIG.rewards.baseTokens *
      DAILY_CHALLENGE_CONFIG.rewards.difficultyMultiplier[difficulty]
  );

  const streakBonus = getStreakBonus(streakDays);

  return {
    baseTokens,
    streakBonus,
    total: baseTokens + streakBonus,
  };
}
