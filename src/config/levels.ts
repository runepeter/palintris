import type { LevelConfig, BonusObjective, LevelResult } from '../types';

// Bonus objective helpers
const underOperations = (maxOps: number): BonusObjective => ({
  id: `under_${maxOps}_ops`,
  description: `Complete using ${maxOps} or fewer operations`,
  check: (result: LevelResult): boolean => result.operationsUsed.length <= maxOps,
  bonusPoints: 200,
});

const underTime = (seconds: number): BonusObjective => ({
  id: `under_${seconds}s`,
  description: `Complete in under ${seconds} seconds`,
  check: (result: LevelResult): boolean => result.timeSpent < seconds,
  bonusPoints: 150,
});

const perfectBonus: BonusObjective = {
  id: 'perfect',
  description: 'Complete with minimum operations',
  check: (result: LevelResult): boolean => result.operationsUsed.length === 1,
  bonusPoints: 500,
};

// Level definitions - ALL start as non-palindromes!
export const LEVELS: LevelConfig[] = [
  // ========== TUTORIAL LEVELS (1-5) ==========
  {
    id: 1,
    name: 'First Steps',
    description: 'Swap the last two letters to make a palindrome.',
    sequence: ['A', 'A', 'B'], // Target: ABA
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: null,
    bonusObjectives: [perfectBonus],
    difficulty: 'tutorial',
  },
  {
    id: 2,
    name: 'Mirror Image',
    description: 'Fix the word RACAR to become RADAR or RACAR.',
    sequence: ['R', 'A', 'C', 'R', 'A'], // Target: RACAR or RADAR
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 2,
    symbolCategory: 'letters',
    timeLimit: null,
    bonusObjectives: [perfectBonus],
    difficulty: 'tutorial',
  },
  {
    id: 3,
    name: 'Number Play',
    description: 'Rearrange to read the same forwards and backwards.',
    sequence: ['1', '2', '1', '2'], // Target: 1221 or 2112
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 2,
    symbolCategory: 'numbers',
    timeLimit: null,
    bonusObjectives: [],
    difficulty: 'tutorial',
  },
  {
    id: 4,
    name: 'Longer Chain',
    description: 'A longer sequence requires more thinking!',
    sequence: ['A', 'B', 'C', 'C', 'A', 'B'], // Target: ABCCBA
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: null,
    bonusObjectives: [underOperations(2)],
    difficulty: 'tutorial',
  },
  {
    id: 5,
    name: 'Rotation Introduction',
    description: 'Learn to rotate! Select a range and shift elements.',
    sequence: ['A', 'C', 'B', 'B', 'A'], // Not a palindrome - fix middle
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: null,
    bonusObjectives: [perfectBonus],
    difficulty: 'tutorial',
  },

  // ========== EASY LEVELS (6-15) ==========
  // Gradual time pressure introduction: 120s → 45s
  {
    id: 6,
    name: 'Quick Fix',
    description: 'One swap to make MADAM. First level with a time limit!',
    sequence: ['M', 'D', 'A', 'A', 'M'], // Target: MADAM
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: 120, // Gentle intro to time pressure
    bonusObjectives: [underTime(30), underOperations(1)],
    difficulty: 'easy',
  },
  {
    id: 7,
    name: 'Shape Shifter',
    description: 'Shapes follow the same rules as letters!',
    sequence: ['●', '▲', '■', '■', '●'], // Target: ●■▲■●
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 3,
    symbolCategory: 'shapes',
    timeLimit: 100, // Still comfortable
    bonusObjectives: [underTime(40)],
    difficulty: 'easy',
  },
  {
    id: 8,
    name: 'Color Wheel',
    description: 'Match the colors on both ends.',
    sequence: ['R', 'G', 'B', 'R', 'B', 'G'], // Target: RGBBGR or GRBBRG
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 4,
    symbolCategory: 'colors',
    timeLimit: 90, // Getting tighter
    bonusObjectives: [underOperations(2)],
    difficulty: 'easy',
  },
  {
    id: 9,
    name: 'Number Crunch',
    description: 'Arrange these digits into a palindromic number.',
    sequence: ['1', '3', '2', '2', '1'], // Target: 12321
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 2,
    symbolCategory: 'numbers',
    timeLimit: 75, // Building pressure
    bonusObjectives: [perfectBonus],
    difficulty: 'easy',
  },
  {
    id: 10,
    name: 'Double Trouble',
    description: 'Two pairs need fixing.',
    sequence: ['A', 'B', 'B', 'A', 'B', 'A', 'A', 'B'], // Target: ABBAABBA
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 70,
    bonusObjectives: [underOperations(2), underTime(35)],
    difficulty: 'easy',
  },
  {
    id: 11,
    name: 'Rotate Right',
    description: 'Sometimes rotation is the key.',
    sequence: ['C', 'D', 'A', 'B', 'B', 'D', 'C'], // Target: CDBABDC
    targetPalindrome: null,
    allowedOperations: ['rotate', 'swap'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: 65, // Continued ramp
    bonusObjectives: [perfectBonus],
    difficulty: 'easy',
  },
  {
    id: 12,
    name: 'Mixed Signals',
    description: 'Different symbols, same goal.',
    sequence: ['●', '1', 'A', '●', 'A'], // Target: ●A1A● or A●1●A
    targetPalindrome: null,
    allowedOperations: ['swap'],
    maxOperations: 3,
    symbolCategory: 'mixed',
    timeLimit: 60, // Standard challenge
    bonusObjectives: [underOperations(2)],
    difficulty: 'easy',
  },
  {
    id: 13,
    name: 'Five Alive',
    description: 'A five-element challenge.',
    sequence: ['X', 'Z', 'Y', 'Y', 'X'], // Target: XYZYX
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 55, // Getting serious
    bonusObjectives: [underOperations(2)],
    difficulty: 'easy',
  },
  {
    id: 14,
    name: 'Shape Up',
    description: 'Get these shapes in order!',
    sequence: ['▲', '●', '■', '●', '■', '▲'], // Target: ▲■●●■▲
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 5,
    symbolCategory: 'shapes',
    timeLimit: 50, // Tight but fair
    bonusObjectives: [underOperations(3), underTime(25)],
    difficulty: 'easy',
  },
  {
    id: 15,
    name: 'Easy Does It',
    description: 'Last easy level - show what you learned!',
    sequence: ['1', '2', '4', '3', '3', '2', '1'], // Target: 1234321
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 3,
    symbolCategory: 'numbers',
    timeLimit: 45, // Full challenge mode
    bonusObjectives: [perfectBonus, underTime(20)],
    difficulty: 'easy',
  },

  // ========== MEDIUM LEVELS (16-30) ==========
  {
    id: 16,
    name: 'Mirror Master',
    description: 'Learn the mirror operation - it reverses a section!',
    sequence: ['A', 'B', 'C', 'D', 'C', 'B', 'A', 'E', 'D'], // Scrambled ABCDEDCBA
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [underOperations(2), underTime(45)],
    difficulty: 'medium',
  },
  {
    id: 17,
    name: 'Tight Squeeze',
    description: 'Limited operations - think carefully!',
    sequence: ['P', 'A', 'L', 'I', 'N', 'D', 'R', 'O', 'M', 'E'],
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete'],
    maxOperations: 6,
    symbolCategory: 'letters',
    timeLimit: 120,
    bonusObjectives: [underOperations(4)],
    difficulty: 'medium',
  },
  {
    id: 18,
    name: 'Number Theory',
    description: 'Mathematical palindromes are beautiful.',
    sequence: ['9', '8', '7', '6', '5', '7', '5', '8', '9'], // Target: 987565789
    targetPalindrome: null,
    allowedOperations: ['swap', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'numbers',
    timeLimit: 90,
    bonusObjectives: [underOperations(2)],
    difficulty: 'medium',
  },
  {
    id: 19,
    name: 'Shape Symphony',
    description: 'A complex arrangement of shapes.',
    sequence: ['●', '◆', '▲', '■', '★', '▲', '■', '◆', '●'], // Target: ●◆■▲★▲■◆●
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'shapes',
    timeLimit: 90,
    bonusObjectives: [underTime(60)],
    difficulty: 'medium',
  },
  {
    id: 20,
    name: 'Color Cascade',
    description: 'A rainbow of possibilities.',
    sequence: ['R', 'O', 'Y', 'G', 'B', 'P', 'B', 'G', 'O', 'Y', 'R'], // Target: ROYGBPBGYOR
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 5,
    symbolCategory: 'colors',
    timeLimit: 120,
    bonusObjectives: [underOperations(3), underTime(60)],
    difficulty: 'medium',
  },
  {
    id: 21,
    name: 'Speed Run',
    description: 'Quick thinking required!',
    sequence: ['A', 'C', 'B', 'A', 'B', 'A', 'A'], // Target: ABACABA
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: 30,
    bonusObjectives: [underTime(15), perfectBonus],
    difficulty: 'medium',
  },
  {
    id: 22,
    name: 'Mirror Mirror',
    description: 'Use the mirror strategically.',
    sequence: ['W', 'O', 'D', 'R', 'R', 'O', 'W'], // Target: WORDROW
    targetPalindrome: null,
    allowedOperations: ['mirror'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: 60,
    bonusObjectives: [perfectBonus],
    difficulty: 'medium',
  },
  {
    id: 23,
    name: 'Digit Dance',
    description: 'Numbers in motion.',
    sequence: ['2', '1', '1', '3', '5', '3', '1', '2', '1'], // Target: 112353211
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'numbers',
    timeLimit: 90,
    bonusObjectives: [underOperations(2)],
    difficulty: 'medium',
  },
  {
    id: 24,
    name: 'Mixed Mastery',
    description: 'Handle all symbol types!',
    sequence: ['1', 'A', '●', '★', '●', '1', 'A'], // Target: A1●★●1A
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 3,
    symbolCategory: 'mixed',
    timeLimit: 75,
    bonusObjectives: [perfectBonus],
    difficulty: 'medium',
  },
  {
    id: 25,
    name: 'Long Shot',
    description: 'A lengthy sequence to tackle.',
    sequence: ['A', 'B', 'C', 'D', 'E', 'G', 'F', 'E', 'D', 'C', 'B', 'A', 'F'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 120,
    bonusObjectives: [underOperations(3), underTime(60)],
    difficulty: 'medium',
  },
  {
    id: 26,
    name: 'Triple Threat',
    description: 'Three different operations, one goal.',
    sequence: ['X', 'Y', 'X', 'Z', 'X', 'X', 'Y'], // Scrambled XYXZXYX
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 75,
    bonusObjectives: [underOperations(2)],
    difficulty: 'medium',
  },
  {
    id: 27,
    name: 'Symmetry Seeker',
    description: 'Find the hidden symmetry.',
    sequence: ['●', '■', '▲', '■', '▲', '▲', '●'], // Target: ●■▲▲▲■●
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'shapes',
    timeLimit: 90,
    bonusObjectives: [underTime(45)],
    difficulty: 'medium',
  },
  {
    id: 28,
    name: 'Pressure Cooker',
    description: 'Time is running out!',
    sequence: ['1', '2', '3', '5', '4', '4', '3', '2', '1'], // Scrambled 123454321
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate'],
    maxOperations: 3,
    symbolCategory: 'numbers',
    timeLimit: 45,
    bonusObjectives: [underTime(25), perfectBonus],
    difficulty: 'medium',
  },
  {
    id: 29,
    name: 'Pattern Recognition',
    description: 'See the pattern, solve the puzzle.',
    sequence: ['A', 'A', 'B', 'B', 'C', 'C', 'B', 'A', 'B', 'A'], // Scrambled AABBCCBBAA
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [underOperations(2), underTime(45)],
    difficulty: 'medium',
  },
  {
    id: 30,
    name: 'Medium Finale',
    description: 'The ultimate medium challenge!',
    sequence: ['M', 'E', 'D', 'I', 'U', 'M', 'U', 'I', 'E', 'D', 'M'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 120,
    bonusObjectives: [underOperations(3), underTime(60)],
    difficulty: 'medium',
  },

  // ========== HARD LEVELS (31-45) ==========
  {
    id: 31,
    name: 'Insert Intro',
    description: 'Learn to insert! Add the missing piece.',
    sequence: ['A', 'B', 'C', 'A'], // Insert B: ABCBA
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [underOperations(2)],
    difficulty: 'hard',
  },
  {
    id: 32,
    name: 'Delete Dilemma',
    description: 'Sometimes less is more. Remove the odd one out.',
    sequence: ['A', 'B', 'X', 'C', 'C', 'B', 'A'], // Remove X for ABCCBA
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'delete'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: 75,
    bonusObjectives: [perfectBonus],
    difficulty: 'hard',
  },
  {
    id: 33,
    name: 'Full Arsenal',
    description: 'Use all your tools wisely.',
    sequence: ['1', '2', '3', '4', '6', '5', '5', '4', '3', '2', '1'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete'],
    maxOperations: 4,
    symbolCategory: 'numbers',
    timeLimit: 120,
    bonusObjectives: [underOperations(2), underTime(60)],
    difficulty: 'hard',
  },
  {
    id: 34,
    name: 'Surgical Precision',
    description: 'One wrong move and it falls apart.',
    sequence: ['P', 'A', 'L', 'I', 'N', 'D', 'R', 'O', 'M', 'E', 'S'],
    targetPalindrome: null,
    allowedOperations: ['swap', 'delete'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [underOperations(2)],
    difficulty: 'hard',
  },
  {
    id: 35,
    name: 'Shape Surgeon',
    description: 'Precise modifications needed.',
    sequence: ['●', '■', '◆', '▲', '★', '♥', '◆', '★', '▲', '■', '●'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'delete'],
    maxOperations: 4,
    symbolCategory: 'shapes',
    timeLimit: 120,
    bonusObjectives: [underOperations(2)],
    difficulty: 'hard',
  },
  {
    id: 36,
    name: 'Time Attack',
    description: 'Every second counts!',
    sequence: ['A', 'B', 'C', 'E', 'D', 'D', 'C', 'B', 'A'], // Scrambled ABCDEDCBA
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 3,
    symbolCategory: 'letters',
    timeLimit: 20,
    bonusObjectives: [underTime(10)],
    difficulty: 'hard',
  },
  {
    id: 37,
    name: 'Color Conundrum',
    description: 'Complex color arrangements.',
    sequence: ['R', 'G', 'B', 'Y', 'P', 'O', 'C', 'O', 'P', 'B', 'Y', 'G', 'R'], // Target: RGBYPOCOPYBGR
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete'],
    maxOperations: 5,
    symbolCategory: 'colors',
    timeLimit: 150,
    bonusObjectives: [underOperations(3)],
    difficulty: 'hard',
  },
  {
    id: 38,
    name: 'Minimal Moves',
    description: 'Can you do it in just 2 moves?',
    sequence: ['X', 'Y', 'A', 'Z', 'Z', 'Y', 'X'], // Target: XYZAZYX - swap A and Z
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'delete'],
    maxOperations: 2,
    symbolCategory: 'letters',
    timeLimit: 60,
    bonusObjectives: [perfectBonus],
    difficulty: 'hard',
  },
  {
    id: 39,
    name: 'Number Nightmare',
    description: 'A numerical nightmare!',
    sequence: ['9', '1', '8', '2', '7', '3', '6', '5', '4', '6', '3', '7', '2', '8', '1', '9', '4'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete'],
    maxOperations: 6,
    symbolCategory: 'numbers',
    timeLimit: 180,
    bonusObjectives: [underOperations(4), underTime(90)],
    difficulty: 'hard',
  },
  {
    id: 40,
    name: 'Mixed Mayhem',
    description: 'All symbol types, all operations!',
    sequence: ['A', '1', 'B', '●', '2', '■', 'C', '2', '■', 'B', '●', '1', 'A'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete'],
    maxOperations: 5,
    symbolCategory: 'mixed',
    timeLimit: 150,
    bonusObjectives: [underOperations(3)],
    difficulty: 'hard',
  },
  {
    id: 41,
    name: 'Insert & Delete',
    description: 'Master both adding and removing.',
    sequence: ['K', 'A', 'Y', 'K'], // Needs A in middle: KAYAK
    targetPalindrome: ['K', 'A', 'Y', 'A', 'K'],
    allowedOperations: ['insert', 'delete'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [underOperations(2)],
    difficulty: 'hard',
  },
  {
    id: 42,
    name: 'Rotation Station',
    description: 'Only rotation allowed!',
    sequence: ['B', 'A', 'C', 'D', 'E', 'F', 'G', 'F', 'E', 'D', 'C', 'B', 'A'], // Target: ABCDEFGFEDCBA
    targetPalindrome: null,
    allowedOperations: ['rotate', 'swap'],
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 120,
    bonusObjectives: [underOperations(3), underTime(60)],
    difficulty: 'hard',
  },
  {
    id: 43,
    name: 'Mirror Maze',
    description: 'Navigate the mirror maze.',
    sequence: ['M', 'I', 'R', 'O', 'R', 'R', 'I', 'R', 'M'], // Target: MIRRORRIM
    targetPalindrome: null,
    allowedOperations: ['mirror', 'swap'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 75,
    bonusObjectives: [underOperations(2)],
    difficulty: 'hard',
  },
  {
    id: 44,
    name: 'Speed Demon',
    description: 'Lightning fast reflexes needed!',
    sequence: ['1', '2', '3', '4', '5', '7', '6', '5', '4', '3', '2', '1', '6'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror'],
    maxOperations: 3,
    symbolCategory: 'numbers',
    timeLimit: 15,
    bonusObjectives: [underTime(8)],
    difficulty: 'hard',
  },
  {
    id: 45,
    name: 'Hard Finale',
    description: 'The ultimate hard challenge!',
    sequence: ['H', 'A', 'R', 'D', 'O', 'C', 'R', 'E', 'C', 'O', 'R', 'D', 'R', 'A', 'H'], // Scrambled HARDCOREOCDRACH
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete'],
    maxOperations: 6,
    symbolCategory: 'letters',
    timeLimit: 180,
    bonusObjectives: [underOperations(4), underTime(90)],
    difficulty: 'hard',
  },

  // ========== EXPERT LEVELS (46-50) ==========
  {
    id: 46,
    name: 'Replace & Conquer',
    description: 'The final operation: replace!',
    sequence: ['E', 'X', 'P', 'E', 'R', 'T'],
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'],
    maxOperations: 4,
    symbolCategory: 'letters',
    timeLimit: 120,
    bonusObjectives: [underOperations(2)],
    difficulty: 'expert',
  },
  {
    id: 47,
    name: 'Ultimate Challenge',
    description: 'All operations, limited moves.',
    sequence: ['U', 'L', 'T', 'I', 'M', 'A', 'T', 'E'],
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'],
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 180,
    bonusObjectives: [underOperations(3), underTime(90)],
    difficulty: 'expert',
  },
  {
    id: 48,
    name: 'Chaos Theory',
    description: 'Pure chaos. Find order.',
    sequence: ['C', 'H', 'A', 'O', 'S', 'T', 'H', 'E', 'O', 'R', 'Y'],
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'],
    maxOperations: 7,
    symbolCategory: 'letters',
    timeLimit: 240,
    bonusObjectives: [underOperations(5), underTime(120)],
    difficulty: 'expert',
  },
  {
    id: 49,
    name: 'The Gauntlet',
    description: 'Only the best will pass.',
    sequence: ['1', 'A', '2', '●', 'B', '3', '■', 'C', '▲', '3', 'C', '■', 'B', '●', '2', 'A', '1'], // Scrambled
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'],
    maxOperations: 5,
    symbolCategory: 'mixed',
    timeLimit: 180,
    bonusObjectives: [underOperations(3), underTime(60)],
    difficulty: 'expert',
  },
  {
    id: 50,
    name: 'Palintris Master',
    description: 'You have mastered Palintris!',
    sequence: ['P', 'A', 'L', 'I', 'N', 'T', 'R', 'I', 'S', 'M', 'A', 'S', 'T', 'E', 'R'],
    targetPalindrome: null,
    allowedOperations: ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'],
    maxOperations: 8,
    symbolCategory: 'letters',
    timeLimit: 300,
    bonusObjectives: [underOperations(5), underTime(120)],
    difficulty: 'expert',
  },
];

export const getLevelById = (id: number): LevelConfig | undefined => {
  return LEVELS.find((level) => level.id === id);
};

export const getLevelsByDifficulty = (
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert'
): LevelConfig[] => {
  return LEVELS.filter((level) => level.difficulty === difficulty);
};

export const getNextLevel = (currentId: number): LevelConfig | undefined => {
  const currentIndex = LEVELS.findIndex((level) => level.id === currentId);
  if (currentIndex === -1 || currentIndex >= LEVELS.length - 1) {
    return undefined;
  }
  return LEVELS[currentIndex + 1];
};

export const getTotalLevels = (): number => {
  return LEVELS.length;
};
