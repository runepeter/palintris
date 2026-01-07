/**
 * Time Attack mode configuration
 */

export interface TimeAttackConfig {
  startingTime: number;         // Starting time in seconds
  startingMoves: number;        // Starting moves per puzzle
  bonusTimePerSolve: number;    // Bonus time awarded per solved puzzle
  minMoves: number;             // Minimum moves at max difficulty
  difficultyRampSpeed: number;  // How quickly difficulty increases
  baseSequenceLength: number;   // Starting sequence length
  maxSequenceLength: number;    // Maximum sequence length
  scoreMultiplierBase: number;  // Base score per puzzle
  streakBonusMultiplier: number; // Bonus multiplier per streak
}

export const TIME_ATTACK_CONFIG: TimeAttackConfig = {
  startingTime: 60,
  startingMoves: 5,
  bonusTimePerSolve: 5,
  minMoves: 2,
  difficultyRampSpeed: 0.1,
  baseSequenceLength: 4,
  maxSequenceLength: 8,
  scoreMultiplierBase: 100,
  streakBonusMultiplier: 0.25, // 25% increase per streak
};
