import type { LevelConfig, Difficulty } from '../types';
import type { MechanicalLevelConfig } from '../types';
import { LEVELS } from './levels';
import { MECHANICAL_LEVELS } from './mechanicalLevels';

// Level types in the unified progression
export type LevelType = 'classic' | 'mechanical' | 'time_attack_unlock' | 'daily_challenge_unlock';

// Unified level configuration
export interface UnifiedLevelConfig {
  readonly id: number;
  readonly type: LevelType;
  readonly classicConfig?: LevelConfig;
  readonly mechanicalConfig?: MechanicalLevelConfig;
  readonly isMilestone: boolean;
  readonly milestoneIcon?: string;
  readonly milestoneLabel?: string;
}

// Map mechanical levels to milestone positions
const MECHANICAL_MILESTONE_MAP: Record<number, number> = {
  10: 51,  // First Gear - intro to mechanical
  20: 55,  // Double Gears - more complex
  30: 56,  // Pipe Dream - pipes introduced
  40: 66,  // The Machine - all mechanics
  50: 70,  // Mechanical Master - finale
};

// Special milestone levels (unlocks)
const TIME_ATTACK_UNLOCK_LEVEL = 15;
const DAILY_CHALLENGE_UNLOCK_LEVEL = 45;

// Build the unified level list
function buildUnifiedLevels(): UnifiedLevelConfig[] {
  const unified: UnifiedLevelConfig[] = [];

  // Get classic levels sorted by ID
  const classicLevels = [...LEVELS].sort((a, b) => a.id - b.id);

  let classicIndex = 0;

  for (let levelNum = 1; levelNum <= 60; levelNum++) {
    // Check if this is a mechanical milestone
    const mechanicalId = MECHANICAL_MILESTONE_MAP[levelNum];
    if (mechanicalId !== undefined) {
      const mechanicalLevel = MECHANICAL_LEVELS.find(m => m.id === mechanicalId);
      if (mechanicalLevel) {
        unified.push({
          id: levelNum,
          type: 'mechanical',
          mechanicalConfig: mechanicalLevel,
          isMilestone: true,
          milestoneIcon: '⚙️',
          milestoneLabel: 'Mechanical',
        });
        continue;
      }
    }

    // Check if this is Time Attack unlock
    if (levelNum === TIME_ATTACK_UNLOCK_LEVEL) {
      // This is still a classic level, but marks Time Attack unlock
      const classicLevel = classicLevels[classicIndex];
      if (classicLevel) {
        unified.push({
          id: levelNum,
          type: 'time_attack_unlock',
          classicConfig: classicLevel,
          isMilestone: true,
          milestoneIcon: '⏱️',
          milestoneLabel: 'Time Attack Unlocked!',
        });
        classicIndex++;
        continue;
      }
    }

    // Check if this is Daily Challenge unlock
    if (levelNum === DAILY_CHALLENGE_UNLOCK_LEVEL) {
      const classicLevel = classicLevels[classicIndex];
      if (classicLevel) {
        unified.push({
          id: levelNum,
          type: 'daily_challenge_unlock',
          classicConfig: classicLevel,
          isMilestone: true,
          milestoneIcon: '📅',
          milestoneLabel: 'Daily Challenge Unlocked!',
        });
        classicIndex++;
        continue;
      }
    }

    // Regular classic level
    const classicLevel = classicLevels[classicIndex];
    if (classicLevel) {
      unified.push({
        id: levelNum,
        type: 'classic',
        classicConfig: classicLevel,
        isMilestone: false,
      });
      classicIndex++;
    }
  }

  return unified;
}

export const UNIFIED_LEVELS = buildUnifiedLevels();

// Helper functions
export const getUnifiedLevelById = (id: number): UnifiedLevelConfig | undefined => {
  return UNIFIED_LEVELS.find(level => level.id === id);
};

export const getNextUnifiedLevel = (currentId: number): UnifiedLevelConfig | undefined => {
  const currentIndex = UNIFIED_LEVELS.findIndex(level => level.id === currentId);
  if (currentIndex === -1 || currentIndex >= UNIFIED_LEVELS.length - 1) {
    return undefined;
  }
  return UNIFIED_LEVELS[currentIndex + 1];
};

export const isLevelUnlocked = (levelId: number, completedLevels: number[]): boolean => {
  // Level 1 is always unlocked
  if (levelId === 1) return true;

  // Already completed levels are always unlocked
  if (completedLevels.includes(levelId)) return true;

  // Check if previous level is completed
  return completedLevels.includes(levelId - 1);
};

export const getLevelDifficulty = (level: UnifiedLevelConfig): Difficulty => {
  if (level.classicConfig) {
    return level.classicConfig.difficulty;
  }
  if (level.mechanicalConfig) {
    return level.mechanicalConfig.difficulty;
  }
  return 'medium';
};

export const getTotalUnifiedLevels = (): number => {
  return UNIFIED_LEVELS.length;
};

export const getMilestoneLevels = (): UnifiedLevelConfig[] => {
  return UNIFIED_LEVELS.filter(level => level.isMilestone);
};

// Check if Time Attack is unlocked
export const isTimeAttackUnlocked = (completedLevels: number[]): boolean => {
  return completedLevels.includes(TIME_ATTACK_UNLOCK_LEVEL);
};

// Check if Daily Challenge is unlocked
export const isDailyChallengeUnlocked = (completedLevels: number[]): boolean => {
  return completedLevels.includes(DAILY_CHALLENGE_UNLOCK_LEVEL);
};

export { TIME_ATTACK_UNLOCK_LEVEL, DAILY_CHALLENGE_UNLOCK_LEVEL };
