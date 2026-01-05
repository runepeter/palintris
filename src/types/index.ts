// Symbol Categories
export type SymbolCategory = 'letters' | 'numbers' | 'shapes' | 'colors' | 'mixed';

// Symbol definition
export interface Symbol {
  readonly id: string;
  readonly display: string;
  readonly category: SymbolCategory;
  readonly color: number;
  readonly sprite?: string;  // Optional sprite key for image-based symbols
}

// Available operations
export type OperationType =
  | 'swap'           // Swap two adjacent symbols
  | 'rotate'         // Rotate a section
  | 'mirror'         // Mirror a section around a pivot
  | 'insert'         // Insert a symbol
  | 'delete'         // Delete a symbol
  | 'replace';       // Replace a symbol with another

export interface Operation {
  readonly type: OperationType;
  readonly name: string;
  readonly description: string;
  readonly cost: number;  // Points cost to use
  readonly icon: string;
}

// Level configuration
export interface LevelConfig {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly sequence: string[];
  readonly targetPalindrome: string[] | null;  // null = any palindrome is valid
  readonly allowedOperations: OperationType[];
  readonly maxOperations: number;
  readonly symbolCategory: SymbolCategory;
  readonly timeLimit: number | null;  // seconds, null = no limit
  readonly bonusObjectives: BonusObjective[];
  readonly difficulty: Difficulty;
}

export type Difficulty = 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';

export interface BonusObjective {
  readonly id: string;
  readonly description: string;
  readonly check: (result: LevelResult) => boolean;
  readonly bonusPoints: number;
}

// Level result
export interface LevelResult {
  readonly levelId: number;
  readonly completed: boolean;
  readonly finalSequence: string[];
  readonly operationsUsed: OperationRecord[];
  readonly timeSpent: number;
  readonly score: number;
  readonly bonusesAchieved: string[];
  readonly isPalindrome: boolean;
}

export interface OperationRecord {
  readonly operation: OperationType;
  readonly position: number;
  readonly targetPosition?: number;
  readonly symbol?: string;
  readonly timestamp: number;
}

// Game state
export interface GameState {
  currentLevel: number;
  totalScore: number;
  levelsCompleted: number[];
  achievements: string[];
  highScores: Record<number, number>;
}

// Player progress
export interface PlayerProgress {
  readonly gameState: GameState;
  readonly settings: GameSettings;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  particlesEnabled: boolean;
  colorBlindMode: boolean;
}

// Events
export type GameEventType =
  | 'operationApplied'
  | 'palindromeFound'
  | 'levelComplete'
  | 'levelFailed'
  | 'bonusAchieved'
  | 'achievementUnlocked';

export interface GameEvent {
  readonly type: GameEventType;
  readonly data: unknown;
  readonly timestamp: number;
}

// Puzzle state
export interface PuzzleState {
  readonly sequence: string[];
  readonly originalSequence: readonly string[];
  readonly operationsRemaining: number;
  readonly operationsUsed: OperationRecord[];
  readonly timeRemaining: number | null;
  readonly isComplete: boolean;
}

// Animation state
export interface AnimationState {
  readonly isAnimating: boolean;
  readonly currentAnimation: string | null;
}

// Tile representation for the game board
export interface Tile {
  readonly symbol: Symbol;
  readonly x: number;
  readonly y: number;
  readonly index: number;
  selected: boolean;
}

// Achievement definition
export interface Achievement {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly condition: (state: GameState) => boolean;
  readonly points: number;
}
