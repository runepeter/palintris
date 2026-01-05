// Power-up types
export type PowerUpType =
  | 'extra_move'      // +1 operation
  | 'extra_time'      // +15 seconds
  | 'freeze_time'     // Freeze timer for 10 seconds
  | 'hint'            // Show a helpful hint
  | 'undo_all'        // Reset to start without penalty
  | 'auto_solve'      // Solve one step automatically
  | 'wild_card'       // Replace any symbol with wildcard
  | 'double_points';  // 2x points for this level

export interface PowerUp {
  readonly type: PowerUpType;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly color: number;
  readonly rarity: 'common' | 'rare' | 'epic' | 'legendary';
  readonly duration?: number;  // Duration in ms for timed power-ups
}

export const POWER_UPS: Record<PowerUpType, PowerUp> = {
  extra_move: {
    type: 'extra_move',
    name: 'Extra Move',
    description: 'Gain +1 operation to use',
    icon: '+1',
    color: 0x00ff88,
    rarity: 'common',
  },
  extra_time: {
    type: 'extra_time',
    name: 'Time Bonus',
    description: 'Add 15 seconds to the timer',
    icon: '⏱️',
    color: 0xffff00,
    rarity: 'common',
  },
  freeze_time: {
    type: 'freeze_time',
    name: 'Time Freeze',
    description: 'Freeze the timer for 10 seconds',
    icon: '❄️',
    color: 0x00ffff,
    rarity: 'rare',
    duration: 10000,
  },
  hint: {
    type: 'hint',
    name: 'Hint',
    description: 'Get a hint for the next move',
    icon: '💡',
    color: 0xffd700,
    rarity: 'common',
  },
  undo_all: {
    type: 'undo_all',
    name: 'Fresh Start',
    description: 'Reset the puzzle without losing progress',
    icon: '↩️',
    color: 0xff8800,
    rarity: 'rare',
  },
  auto_solve: {
    type: 'auto_solve',
    name: 'Auto Step',
    description: 'Automatically perform one correct operation',
    icon: '🤖',
    color: 0xff00ff,
    rarity: 'epic',
  },
  wild_card: {
    type: 'wild_card',
    name: 'Wild Card',
    description: 'Place a wildcard that matches any symbol',
    icon: '🃏',
    color: 0xffffff,
    rarity: 'epic',
  },
  double_points: {
    type: 'double_points',
    name: 'Double Points',
    description: 'Earn 2x points for this level',
    icon: '2×',
    color: 0xffd700,
    rarity: 'legendary',
  },
};

// Player inventory for power-ups
export interface PowerUpInventory {
  extra_move: number;
  extra_time: number;
  freeze_time: number;
  hint: number;
  undo_all: number;
  auto_solve: number;
  wild_card: number;
  double_points: number;
}

export const createEmptyInventory = (): PowerUpInventory => ({
  extra_move: 0,
  extra_time: 0,
  freeze_time: 0,
  hint: 0,
  undo_all: 0,
  auto_solve: 0,
  wild_card: 0,
  double_points: 0,
});

// Default starting inventory
export const createStarterInventory = (): PowerUpInventory => ({
  extra_move: 3,
  extra_time: 2,
  freeze_time: 1,
  hint: 5,
  undo_all: 2,
  auto_solve: 0,
  wild_card: 0,
  double_points: 0,
});

// Rewards for completing levels
export interface LevelReward {
  readonly tokens: number;
  readonly powerUps: Partial<PowerUpInventory>;
}

export const getLevelReward = (
  levelId: number,
  difficulty: string,
  score: number,
  bonusCount: number
): LevelReward => {
  // Base token reward
  let tokens = 10;

  switch (difficulty) {
    case 'tutorial':
      tokens = 5;
      break;
    case 'easy':
      tokens = 10;
      break;
    case 'medium':
      tokens = 20;
      break;
    case 'hard':
      tokens = 35;
      break;
    case 'expert':
      tokens = 50;
      break;
  }

  // Bonus tokens for high scores
  tokens += Math.floor(score / 500);

  // Bonus tokens for achieving bonus objectives
  tokens += bonusCount * 10;

  // Power-up rewards based on level milestones
  const powerUps: Partial<PowerUpInventory> = {};

  if (levelId % 5 === 0) {
    powerUps.hint = 1;
  }

  if (levelId % 10 === 0) {
    powerUps.extra_move = 1;
    powerUps.extra_time = 1;
  }

  if (levelId % 15 === 0) {
    powerUps.freeze_time = 1;
  }

  if (levelId % 25 === 0) {
    powerUps.auto_solve = 1;
  }

  if (levelId === 50) {
    powerUps.wild_card = 2;
    powerUps.double_points = 1;
  }

  return { tokens, powerUps };
};

// Power-up shop prices (in tokens)
export const POWER_UP_PRICES: Record<PowerUpType, number> = {
  extra_move: 20,
  extra_time: 15,
  freeze_time: 40,
  hint: 10,
  undo_all: 30,
  auto_solve: 100,
  wild_card: 150,
  double_points: 200,
};

// Get random power-up drop (for achievements etc)
export const getRandomPowerUp = (
  rarityWeights: { common: number; rare: number; epic: number; legendary: number } = {
    common: 60,
    rare: 25,
    epic: 12,
    legendary: 3,
  }
): PowerUpType => {
  const total = rarityWeights.common + rarityWeights.rare + rarityWeights.epic + rarityWeights.legendary;
  const roll = Math.random() * total;

  let rarity: 'common' | 'rare' | 'epic' | 'legendary';
  if (roll < rarityWeights.common) {
    rarity = 'common';
  } else if (roll < rarityWeights.common + rarityWeights.rare) {
    rarity = 'rare';
  } else if (roll < rarityWeights.common + rarityWeights.rare + rarityWeights.epic) {
    rarity = 'epic';
  } else {
    rarity = 'legendary';
  }

  const powerUpsOfRarity = Object.values(POWER_UPS).filter((p) => p.rarity === rarity);
  const randomPowerUp = powerUpsOfRarity[Math.floor(Math.random() * powerUpsOfRarity.length)];

  return randomPowerUp?.type ?? 'hint';
};
