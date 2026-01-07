import type { LevelConfig, OperationType } from '../types';
import { SYMBOLS } from '../config/symbols';

/**
 * Mulberry32 seeded PRNG - Simple and fast with good distribution
 * Returns a function that generates random numbers [0, 1)
 */
function mulberry32(seed: number): () => number {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a date string to a deterministic seed number
 */
function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get difficulty for a specific day of week
 * Weekends are easier, midweek is harder
 */
function getDifficultyForDate(date: Date): 'easy' | 'medium' | 'hard' {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

  // Weekend: Easy
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'easy';
  }

  // Tuesday and Wednesday: Hard (peak difficulty midweek)
  if (dayOfWeek === 2 || dayOfWeek === 3) {
    return 'hard';
  }

  // Monday, Thursday, Friday: Medium
  return 'medium';
}

/**
 * Generate a random sequence that is NOT a palindrome
 */
function generateNonPalindromeSequence(
  rng: () => number,
  length: number,
  symbolPool: string[]
): string[] {
  let sequence: string[] = [];
  let attempts = 0;
  const maxAttempts = 100;

  // Keep generating until we get a non-palindrome
  while (attempts < maxAttempts) {
    sequence = [];
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(rng() * symbolPool.length);
      sequence.push(symbolPool[idx] ?? 'A');
    }

    // Check if it's NOT a palindrome
    const isPalin = sequence.join('') === sequence.slice().reverse().join('');
    if (!isPalin) {
      break;
    }

    attempts++;
  }

  // Fallback: if we couldn't generate non-palindrome, make it definitely not one
  if (sequence.join('') === sequence.slice().reverse().join('')) {
    if (sequence.length > 1) {
      // Swap first two elements to break palindrome
      const temp = sequence[0];
      sequence[0] = sequence[1] ?? 'A';
      sequence[1] = temp ?? 'B';
    }
  }

  return sequence;
}

/**
 * Select allowed operations based on difficulty
 */
function getAllowedOperations(
  rng: () => number,
  difficulty: 'easy' | 'medium' | 'hard'
): OperationType[] {
  const allOps: OperationType[] = ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'];

  switch (difficulty) {
    case 'easy':
      // Always include swap and rotate, add 1-2 more
      return ['swap', 'rotate', 'mirror'];

    case 'medium':
      // 4-5 operations
      return ['swap', 'rotate', 'mirror', 'insert', 'delete'];

    case 'hard':
      // All operations, but shuffle order
      const shuffled = [...allOps].sort(() => rng() - 0.5);
      return shuffled.slice(0, 5 + Math.floor(rng() * 2)); // 5-6 operations
  }
}

/**
 * Generate a deterministic daily challenge puzzle from a date string
 * Same date = same puzzle worldwide
 */
export function generateDailyChallenge(dateString: string): LevelConfig {
  const seed = hashDateString(dateString);
  const rng = mulberry32(seed);
  const date = new Date(dateString);
  const difficulty = getDifficultyForDate(date);

  // Determine puzzle parameters based on difficulty
  let sequenceLength: number;
  let maxOperations: number;
  let timeLimit: number;
  let symbolPool: string[];

  switch (difficulty) {
    case 'easy':
      sequenceLength = 5 + Math.floor(rng() * 2); // 5-6 symbols
      maxOperations = 6 + Math.floor(rng() * 2); // 6-7 operations
      timeLimit = 120 + Math.floor(rng() * 60); // 120-180 seconds
      symbolPool = SYMBOLS.letters.slice(0, 6).map(s => s.display); // A-F
      break;

    case 'medium':
      sequenceLength = 6 + Math.floor(rng() * 2); // 6-7 symbols
      maxOperations = 5 + Math.floor(rng() * 2); // 5-6 operations
      timeLimit = 90 + Math.floor(rng() * 30); // 90-120 seconds
      symbolPool = SYMBOLS.letters.slice(0, 8).map(s => s.display); // A-H
      break;

    case 'hard':
      sequenceLength = 7 + Math.floor(rng() * 2); // 7-8 symbols
      maxOperations = 4 + Math.floor(rng() * 2); // 4-5 operations
      timeLimit = 60 + Math.floor(rng() * 30); // 60-90 seconds
      symbolPool = SYMBOLS.letters.slice(0, 10).map(s => s.display); // A-J
      break;
  }

  // Generate starting sequence (not a palindrome)
  const sequence = generateNonPalindromeSequence(rng, sequenceLength, symbolPool);

  // Allowed operations
  const allowedOperations = getAllowedOperations(rng, difficulty);

  // Format date for display
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    id: 9999, // Special ID for daily challenge
    name: `Daily Challenge - ${formattedDate}`,
    description: `Today's ${difficulty} puzzle. One attempt only!`,
    difficulty,
    sequence,
    targetPalindrome: null, // Any palindrome is acceptable
    maxOperations,
    timeLimit,
    allowedOperations,
    symbolCategory: 'letters', // Daily challenges use letters
    bonusObjectives: [
      {
        id: 'speedrun',
        description: 'Complete in under 30 seconds',
        bonusPoints: 500,
        check: (result) => result.completed && result.timeSpent < 30,
      },
      {
        id: 'efficient',
        description: `Use ${Math.ceil(maxOperations * 0.6)} or fewer operations`,
        bonusPoints: 300,
        check: (result) =>
          result.completed &&
          result.operationsUsed.length <= Math.ceil(maxOperations * 0.6),
      },
      {
        id: 'perfect',
        description: 'Complete without using undo',
        bonusPoints: 200,
        check: (result) => result.completed,
      },
    ],
  };
}

/**
 * Get today's date string in ISO format (YYYY-MM-DD)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

/**
 * Check if a date string is today
 */
export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Calculate streak from completed dates array
 * Returns number of consecutive days including today
 */
export function calculateStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;

  const sortedDates = [...completedDates].sort().reverse(); // Most recent first
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    const checkDateStr = expectedDate.toISOString().split('T')[0];
    const actualDateStr = sortedDates[i];

    if (checkDateStr === actualDateStr) {
      streak++;
    } else {
      break; // Streak broken
    }
  }

  return streak;
}
