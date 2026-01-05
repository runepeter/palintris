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

// ============================================
// MECHANICAL PUZZLE SYSTEM TYPES
// ============================================

// Types of mechanical elements
export type MechanicalElementType =
  | 'gear'      // Rotates connected symbols
  | 'pipe'      // Directs flow/pushes symbols
  | 'button'    // Activates mechanisms when pressed
  | 'lever'     // Toggles states
  | 'conveyor'  // Moves symbols in a direction
  | 'marble';   // Ball that rolls and triggers things

// Direction for mechanical elements
export type Direction = 'up' | 'down' | 'left' | 'right';

// Rotation direction
export type RotationDirection = 'clockwise' | 'counterclockwise';

// Pipe types based on connections
export type PipeShape =
  | 'straight_h'    // Horizontal straight
  | 'straight_v'    // Vertical straight
  | 'corner_ne'     // Corner: north to east
  | 'corner_nw'     // Corner: north to west
  | 'corner_se'     // Corner: south to east
  | 'corner_sw'     // Corner: south to west
  | 't_north'       // T-junction opening north
  | 't_south'       // T-junction opening south
  | 't_east'        // T-junction opening east
  | 't_west'        // T-junction opening west
  | 'cross'         // 4-way cross
  | 'end_north'     // End cap facing north
  | 'end_south'     // End cap facing south
  | 'end_east'      // End cap facing east
  | 'end_west';     // End cap facing west

// Base mechanical element
export interface MechanicalElement {
  readonly id: string;
  readonly type: MechanicalElementType;
  readonly gridX: number;  // Grid position
  readonly gridY: number;
  readonly sprite: string;
  readonly interactive: boolean;  // Can player interact with it?
  readonly connectedTo?: string[];  // IDs of connected elements
}

// Gear element - rotates to move symbols
export interface GearElement extends MechanicalElement {
  readonly type: 'gear';
  readonly size: 'small' | 'large';
  readonly connectedSymbolIndices: number[];  // Which symbols this gear affects
  readonly rotationDirection: RotationDirection;
  readonly teethCount: number;  // Affects rotation ratio with connected gears
}

// Pipe element - creates pathways for flow
export interface PipeElement extends MechanicalElement {
  readonly type: 'pipe';
  readonly shape: PipeShape;
  readonly hasFluid: boolean;
  readonly flowDirection?: Direction;
  readonly rotatable: boolean;  // Can player rotate this pipe?
}

// Button element - triggers actions when activated
export interface ButtonElement extends MechanicalElement {
  readonly type: 'button';
  readonly color: 'blue' | 'grey' | 'yellow';
  readonly triggersAction: MechanicalAction;
  readonly oneShot: boolean;  // Can only be pressed once?
}

// Lever element - toggles between states
export interface LeverElement extends MechanicalElement {
  readonly type: 'lever';
  readonly currentState: 'left' | 'right' | 'center';
  readonly states: LeverState[];
}

export interface LeverState {
  readonly position: 'left' | 'right' | 'center';
  readonly action: MechanicalAction;
}

// Conveyor element - moves symbols in a direction
export interface ConveyorElement extends MechanicalElement {
  readonly type: 'conveyor';
  readonly direction: Direction;
  readonly speed: number;  // Symbols moved per activation
  readonly active: boolean;
}

// Marble element - ball that rolls and interacts
export interface MarbleElement extends MechanicalElement {
  readonly type: 'marble';
  readonly color: 'grey' | 'blue' | 'red';
  readonly currentPath?: string[];  // Path of pipe IDs
}

// Actions that mechanical elements can trigger
export type MechanicalActionType =
  | 'rotate_symbols'      // Rotate a group of symbols
  | 'shift_symbols'       // Shift symbols in a direction
  | 'swap_symbols'        // Swap specific symbols
  | 'activate_element'    // Turn on another element
  | 'deactivate_element'  // Turn off another element
  | 'release_marble'      // Release a marble
  | 'open_gate'           // Open a blocking gate
  | 'close_gate';         // Close a blocking gate

export interface MechanicalAction {
  readonly type: MechanicalActionType;
  readonly targetIds?: string[];  // Element IDs to affect
  readonly symbolIndices?: number[];  // Symbol positions to affect
  readonly direction?: Direction | RotationDirection;
  readonly amount?: number;
}

// Mechanical level configuration (extends regular level)
export interface MechanicalLevelConfig extends Omit<LevelConfig, 'allowedOperations'> {
  readonly mechanicalElements: MechanicalElement[];
  readonly mechanicalOperationsAllowed: number;  // Max interactions with mechanisms
  readonly symbolSlots: SymbolSlot[];  // Where symbols can be placed
  readonly goalCondition: MechanicalGoalCondition;
  readonly hints?: string[];
}

// Symbol slot - where symbols sit on the mechanical board
export interface SymbolSlot {
  readonly id: string;
  readonly gridX: number;
  readonly gridY: number;
  readonly connectedGears?: string[];  // Gear IDs that can move this slot
  readonly onConveyor?: string;  // Conveyor ID this slot is on
  readonly inPipe?: string;  // Pipe ID this slot is in
  readonly locked?: boolean;  // Cannot be moved
}

// Goal condition for mechanical levels
export interface MechanicalGoalCondition {
  readonly type: 'palindrome' | 'sequence' | 'positions';
  readonly targetSequence?: string[];  // For 'sequence' type
  readonly targetPositions?: Record<string, number>;  // symbol -> slot index
  readonly palindromeMinLength?: number;
}

// State of a mechanical puzzle during gameplay
export interface MechanicalPuzzleState {
  readonly symbolPositions: Map<string, number>;  // symbol -> slot index
  readonly elementStates: Map<string, MechanicalElementState>;
  readonly marblesInMotion: string[];
  readonly operationsUsed: number;
  readonly isComplete: boolean;
  readonly currentSequence: string[];  // Current order of symbols
}

// Runtime state of a mechanical element
export interface MechanicalElementState {
  readonly elementId: string;
  readonly rotation: number;  // degrees
  readonly active: boolean;
  readonly triggered: boolean;  // For one-shot elements
}
