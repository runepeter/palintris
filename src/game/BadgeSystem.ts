// Badge rarity
export type BadgeRarity = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// Badge definition
export interface Badge {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly rarity: BadgeRarity;
  readonly category: BadgeCategory;
  readonly requirement: BadgeRequirement;
  readonly tokenReward: number;
}

export type BadgeCategory =
  | 'progress'     // Level completion
  | 'mastery'      // Skill-based
  | 'speed'        // Time-based
  | 'collection'   // Collecting things
  | 'special';     // Special achievements

export interface BadgeRequirement {
  readonly type: string;
  readonly value: number;
}

// Rarity colors
export const BADGE_COLORS: Record<BadgeRarity, { bg: number; border: number; glow: number }> = {
  bronze: { bg: 0x8b4513, border: 0xcd7f32, glow: 0xcd7f32 },
  silver: { bg: 0x4a4a4a, border: 0xc0c0c0, glow: 0xc0c0c0 },
  gold: { bg: 0x8b7500, border: 0xffd700, glow: 0xffd700 },
  platinum: { bg: 0x3a5a5a, border: 0xe5e4e2, glow: 0x00ffff },
  diamond: { bg: 0x2a4a6a, border: 0xb9f2ff, glow: 0x00ffff },
};

// All badges in the game
export const BADGES: Badge[] = [
  // ========== PROGRESS BADGES ==========
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Complete your first level',
    icon: '🎯',
    rarity: 'bronze',
    category: 'progress',
    requirement: { type: 'levels_completed', value: 1 },
    tokenReward: 10,
  },
  {
    id: 'getting_started',
    name: 'Getting Started',
    description: 'Complete 5 levels',
    icon: '🚀',
    rarity: 'bronze',
    category: 'progress',
    requirement: { type: 'levels_completed', value: 5 },
    tokenReward: 25,
  },
  {
    id: 'apprentice',
    name: 'Apprentice',
    description: 'Complete 10 levels',
    icon: '📚',
    rarity: 'silver',
    category: 'progress',
    requirement: { type: 'levels_completed', value: 10 },
    tokenReward: 50,
  },
  {
    id: 'journeyman',
    name: 'Journeyman',
    description: 'Complete 25 levels',
    icon: '⚔️',
    rarity: 'gold',
    category: 'progress',
    requirement: { type: 'levels_completed', value: 25 },
    tokenReward: 100,
  },
  {
    id: 'master',
    name: 'Palindrome Master',
    description: 'Complete all 50 levels',
    icon: '👑',
    rarity: 'platinum',
    category: 'progress',
    requirement: { type: 'levels_completed', value: 50 },
    tokenReward: 500,
  },
  {
    id: 'tutorial_complete',
    name: 'Graduate',
    description: 'Complete all tutorial levels',
    icon: '🎓',
    rarity: 'bronze',
    category: 'progress',
    requirement: { type: 'tutorial_complete', value: 1 },
    tokenReward: 20,
  },
  {
    id: 'easy_complete',
    name: 'Easy Rider',
    description: 'Complete all easy levels',
    icon: '🌿',
    rarity: 'silver',
    category: 'progress',
    requirement: { type: 'easy_complete', value: 1 },
    tokenReward: 75,
  },
  {
    id: 'medium_complete',
    name: 'Balanced',
    description: 'Complete all medium levels',
    icon: '⚖️',
    rarity: 'gold',
    category: 'progress',
    requirement: { type: 'medium_complete', value: 1 },
    tokenReward: 150,
  },
  {
    id: 'hard_complete',
    name: 'Hardened',
    description: 'Complete all hard levels',
    icon: '🔥',
    rarity: 'platinum',
    category: 'progress',
    requirement: { type: 'hard_complete', value: 1 },
    tokenReward: 300,
  },
  {
    id: 'expert_complete',
    name: 'Expert',
    description: 'Complete all expert levels',
    icon: '💎',
    rarity: 'diamond',
    category: 'progress',
    requirement: { type: 'expert_complete', value: 1 },
    tokenReward: 750,
  },

  // ========== MASTERY BADGES ==========
  {
    id: 'perfect_10',
    name: 'Perfect Ten',
    description: 'Get all bonuses on 10 levels',
    icon: '🌟',
    rarity: 'gold',
    category: 'mastery',
    requirement: { type: 'perfect_levels', value: 10 },
    tokenReward: 200,
  },
  {
    id: 'no_hints',
    name: 'Self-Reliant',
    description: 'Complete 20 levels without hints',
    icon: '🧠',
    rarity: 'silver',
    category: 'mastery',
    requirement: { type: 'no_hint_levels', value: 20 },
    tokenReward: 100,
  },
  {
    id: 'one_move_wonder',
    name: 'One Move Wonder',
    description: 'Complete a level with just one move',
    icon: '☝️',
    rarity: 'silver',
    category: 'mastery',
    requirement: { type: 'single_move_complete', value: 1 },
    tokenReward: 50,
  },
  {
    id: 'efficiency_expert',
    name: 'Efficiency Expert',
    description: 'Complete 10 levels using minimum moves',
    icon: '📐',
    rarity: 'gold',
    category: 'mastery',
    requirement: { type: 'minimum_move_levels', value: 10 },
    tokenReward: 150,
  },
  {
    id: 'streak_5',
    name: 'On a Roll',
    description: 'Complete 5 levels in a row',
    icon: '🎢',
    rarity: 'silver',
    category: 'mastery',
    requirement: { type: 'win_streak', value: 5 },
    tokenReward: 75,
  },
  {
    id: 'streak_10',
    name: 'Unstoppable',
    description: 'Complete 10 levels in a row',
    icon: '🚂',
    rarity: 'gold',
    category: 'mastery',
    requirement: { type: 'win_streak', value: 10 },
    tokenReward: 200,
  },

  // ========== SPEED BADGES ==========
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a level in under 5 seconds',
    icon: '⚡',
    rarity: 'gold',
    category: 'speed',
    requirement: { type: 'fast_complete', value: 5 },
    tokenReward: 100,
  },
  {
    id: 'quick_thinker',
    name: 'Quick Thinker',
    description: 'Complete 10 levels in under 15 seconds each',
    icon: '💨',
    rarity: 'silver',
    category: 'speed',
    requirement: { type: 'fast_levels_count', value: 10 },
    tokenReward: 75,
  },
  {
    id: 'time_saver',
    name: 'Time Saver',
    description: 'Have 30+ seconds remaining on a timed level',
    icon: '⏰',
    rarity: 'silver',
    category: 'speed',
    requirement: { type: 'time_remaining', value: 30 },
    tokenReward: 50,
  },
  {
    id: 'marathon',
    name: 'Marathon Runner',
    description: 'Play for 60 minutes total',
    icon: '🏃',
    rarity: 'gold',
    category: 'speed',
    requirement: { type: 'play_time_minutes', value: 60 },
    tokenReward: 100,
  },

  // ========== COLLECTION BADGES ==========
  {
    id: 'token_hoarder',
    name: 'Token Collector',
    description: 'Collect 500 tokens',
    icon: '💰',
    rarity: 'silver',
    category: 'collection',
    requirement: { type: 'total_tokens', value: 500 },
    tokenReward: 50,
  },
  {
    id: 'wealthy',
    name: 'Wealthy',
    description: 'Collect 2000 tokens',
    icon: '🏦',
    rarity: 'gold',
    category: 'collection',
    requirement: { type: 'total_tokens', value: 2000 },
    tokenReward: 150,
  },
  {
    id: 'millionaire',
    name: 'Millionaire',
    description: 'Collect 10000 tokens',
    icon: '💎',
    rarity: 'diamond',
    category: 'collection',
    requirement: { type: 'total_tokens', value: 10000 },
    tokenReward: 500,
  },
  {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Reach 50,000 total score',
    icon: '📊',
    rarity: 'gold',
    category: 'collection',
    requirement: { type: 'total_score', value: 50000 },
    tokenReward: 100,
  },
  {
    id: 'powerup_user',
    name: 'Power Player',
    description: 'Use 20 power-ups',
    icon: '⚡',
    rarity: 'silver',
    category: 'collection',
    requirement: { type: 'powerups_used', value: 20 },
    tokenReward: 50,
  },

  // ========== SPECIAL BADGES ==========
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Complete a level with only 1 second remaining',
    icon: '🎬',
    rarity: 'platinum',
    category: 'special',
    requirement: { type: 'clutch_finish', value: 1 },
    tokenReward: 200,
  },
  {
    id: 'palindrome_lover',
    name: 'Palindrome Lover',
    description: 'Find 100 palindromes',
    icon: '❤️',
    rarity: 'gold',
    category: 'special',
    requirement: { type: 'palindromes_found', value: 100 },
    tokenReward: 100,
  },
  {
    id: 'dedication',
    name: 'Dedicated',
    description: 'Play on 7 different days',
    icon: '📅',
    rarity: 'silver',
    category: 'special',
    requirement: { type: 'days_played', value: 7 },
    tokenReward: 75,
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Earn all other badges',
    icon: '🏆',
    rarity: 'diamond',
    category: 'special',
    requirement: { type: 'all_badges', value: 1 },
    tokenReward: 1000,
  },
];

// Player badge progress
export interface BadgeProgress {
  earnedBadges: string[];
  progress: Record<string, number>;
  totalTokensEarned: number;
}

export const createEmptyBadgeProgress = (): BadgeProgress => ({
  earnedBadges: [],
  progress: {},
  totalTokensEarned: 0,
});

// Check if badge requirement is met
export const isBadgeEarned = (badge: Badge, progress: BadgeProgress): boolean => {
  if (progress.earnedBadges.includes(badge.id)) return true;

  const currentProgress = progress.progress[badge.requirement.type] ?? 0;
  return currentProgress >= badge.requirement.value;
};

// Get badge by ID
export const getBadgeById = (id: string): Badge | undefined => {
  return BADGES.find((b) => b.id === id);
};

// Get badges by category
export const getBadgesByCategory = (category: BadgeCategory): Badge[] => {
  return BADGES.filter((b) => b.category === category);
};

// Get badges by rarity
export const getBadgesByRarity = (rarity: BadgeRarity): Badge[] => {
  return BADGES.filter((b) => b.rarity === rarity);
};

// Check for newly earned badges
export const checkNewBadges = (progress: BadgeProgress): Badge[] => {
  const newBadges: Badge[] = [];

  for (const badge of BADGES) {
    if (!progress.earnedBadges.includes(badge.id) && isBadgeEarned(badge, progress)) {
      newBadges.push(badge);
    }
  }

  return newBadges;
};

// Get completion percentage
export const getBadgeCompletionPercent = (progress: BadgeProgress): number => {
  return (progress.earnedBadges.length / BADGES.length) * 100;
};

// Get total possible token rewards
export const getTotalPossibleTokens = (): number => {
  return BADGES.reduce((sum, badge) => sum + badge.tokenReward, 0);
};
