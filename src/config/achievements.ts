import type { Achievement, GameState } from '../types';

export const ACHIEVEMENTS: Achievement[] = [
  // Progress achievements
  {
    id: 'first_palindrome',
    name: 'First Steps',
    description: 'Complete your first level',
    icon: '🎯',
    condition: (state: GameState): boolean => state.levelsCompleted.length >= 1,
    points: 100,
  },
  {
    id: 'five_levels',
    name: 'Getting Started',
    description: 'Complete 5 levels',
    icon: '⭐',
    condition: (state: GameState): boolean => state.levelsCompleted.length >= 5,
    points: 250,
  },
  {
    id: 'ten_levels',
    name: 'Palindrome Apprentice',
    description: 'Complete 10 levels',
    icon: '🌟',
    condition: (state: GameState): boolean => state.levelsCompleted.length >= 10,
    points: 500,
  },
  {
    id: 'twenty_levels',
    name: 'Palindrome Expert',
    description: 'Complete 20 levels',
    icon: '💫',
    condition: (state: GameState): boolean => state.levelsCompleted.length >= 20,
    points: 1000,
  },
  {
    id: 'all_levels',
    name: 'Palindrome Master',
    description: 'Complete all 50 levels',
    icon: '👑',
    condition: (state: GameState): boolean => state.levelsCompleted.length >= 50,
    points: 5000,
  },

  // Difficulty achievements
  {
    id: 'tutorial_complete',
    name: 'Tutorial Graduate',
    description: 'Complete all tutorial levels',
    icon: '📚',
    condition: (state: GameState): boolean => {
      const tutorialIds = [1, 2, 3, 4, 5];
      return tutorialIds.every((id) => state.levelsCompleted.includes(id));
    },
    points: 200,
  },
  {
    id: 'easy_complete',
    name: 'Easy Breezy',
    description: 'Complete all easy levels',
    icon: '🌿',
    condition: (state: GameState): boolean => {
      const easyIds = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      return easyIds.every((id) => state.levelsCompleted.includes(id));
    },
    points: 500,
  },
  {
    id: 'medium_complete',
    name: 'Middle Ground',
    description: 'Complete all medium levels',
    icon: '🔥',
    condition: (state: GameState): boolean => {
      const mediumIds = Array.from({ length: 15 }, (_, i) => 16 + i);
      return mediumIds.every((id) => state.levelsCompleted.includes(id));
    },
    points: 1000,
  },
  {
    id: 'hard_complete',
    name: 'Hardcore',
    description: 'Complete all hard levels',
    icon: '💎',
    condition: (state: GameState): boolean => {
      const hardIds = Array.from({ length: 15 }, (_, i) => 31 + i);
      return hardIds.every((id) => state.levelsCompleted.includes(id));
    },
    points: 2000,
  },
  {
    id: 'expert_complete',
    name: 'Expert Mode',
    description: 'Complete all expert levels',
    icon: '🏆',
    condition: (state: GameState): boolean => {
      const expertIds = [46, 47, 48, 49, 50];
      return expertIds.every((id) => state.levelsCompleted.includes(id));
    },
    points: 3000,
  },

  // Score achievements
  {
    id: 'score_1000',
    name: 'First Thousand',
    description: 'Reach a total score of 1,000',
    icon: '💰',
    condition: (state: GameState): boolean => state.totalScore >= 1000,
    points: 100,
  },
  {
    id: 'score_10000',
    name: 'Ten Grand',
    description: 'Reach a total score of 10,000',
    icon: '💵',
    condition: (state: GameState): boolean => state.totalScore >= 10000,
    points: 500,
  },
  {
    id: 'score_50000',
    name: 'High Roller',
    description: 'Reach a total score of 50,000',
    icon: '💎',
    condition: (state: GameState): boolean => state.totalScore >= 50000,
    points: 1000,
  },
  {
    id: 'score_100000',
    name: 'Palindrome Tycoon',
    description: 'Reach a total score of 100,000',
    icon: '🏦',
    condition: (state: GameState): boolean => state.totalScore >= 100000,
    points: 2500,
  },

  // Special achievements
  {
    id: 'perfect_level',
    name: 'Perfectionist',
    description: 'Complete a level with all bonuses',
    icon: '✨',
    condition: (state: GameState): boolean => {
      // This would need to be tracked separately
      return state.achievements.includes('perfect_level_earned');
    },
    points: 500,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete any level in under 5 seconds',
    icon: '⚡',
    condition: (state: GameState): boolean => {
      return state.achievements.includes('speed_demon_earned');
    },
    points: 750,
  },
  {
    id: 'no_undo',
    name: 'No Regrets',
    description: 'Complete 10 levels without using undo',
    icon: '💪',
    condition: (state: GameState): boolean => {
      return state.achievements.includes('no_undo_earned');
    },
    points: 1000,
  },
];

export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find((a) => a.id === id);
};

export const checkNewAchievements = (state: GameState): Achievement[] => {
  const newAchievements: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements.includes(achievement.id)) {
      if (achievement.condition(state)) {
        newAchievements.push(achievement);
      }
    }
  }

  return newAchievements;
};

export const getTotalAchievementPoints = (earnedIds: string[]): number => {
  return earnedIds.reduce((total, id) => {
    const achievement = getAchievementById(id);
    return total + (achievement?.points ?? 0);
  }, 0);
};
