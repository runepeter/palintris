import type {
  MechanicalLevelConfig,
  GearElement,
  PipeElement,
  ButtonElement,
  SymbolSlot,
} from '../types';

// Helper to create gear elements
const createGear = (
  id: string,
  gridX: number,
  gridY: number,
  connectedSymbolIndices: number[],
  size: 'small' | 'large' = 'large'
): GearElement => ({
  id,
  type: 'gear',
  gridX,
  gridY,
  sprite: size === 'large' ? 'gear_large' : 'gear_narrow',
  interactive: true,
  size,
  connectedSymbolIndices,
  rotationDirection: 'clockwise',
  teethCount: size === 'large' ? 12 : 8,
});

// Helper to create pipe elements
const createPipe = (
  id: string,
  gridX: number,
  gridY: number,
  shape: PipeElement['shape'],
  rotatable: boolean = false
): PipeElement => ({
  id,
  type: 'pipe',
  gridX,
  gridY,
  sprite: `pipe_${shape}`,
  interactive: rotatable,
  shape,
  hasFluid: false,
  rotatable,
});

// Helper to create button elements
const createButton = (
  id: string,
  gridX: number,
  gridY: number,
  color: 'blue' | 'grey' | 'yellow',
  action: ButtonElement['triggersAction']
): ButtonElement => ({
  id,
  type: 'button',
  gridX,
  gridY,
  sprite: `button_${color}`,
  interactive: true,
  color,
  triggersAction: action,
  oneShot: false,
});

// Helper to create symbol slots
const createSlots = (
  positions: Array<{ x: number; y: number; connectedGears?: string[] }>
): SymbolSlot[] =>
  positions.map((pos, i) => ({
    id: `slot_${i}`,
    gridX: pos.x,
    gridY: pos.y,
    connectedGears: pos.connectedGears,
  }));

// ============================================
// MECHANICAL LEVELS - GEAR INTRODUCTION (51-55)
// ============================================
export const MECHANICAL_LEVELS: MechanicalLevelConfig[] = [
  // Level 51: First Gear
  {
    id: 51,
    name: 'First Gear',
    description: 'Click the gear to rotate the symbols. Find the palindrome!',
    sequence: ['A', 'A', 'B', 'B'], // Rotate once → BAAB (palindrome!)
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: null,
    bonusObjectives: [],
    difficulty: 'tutorial',
    mechanicalElements: [
      createGear('gear_1', 3, 2, [0, 1, 2, 3]),
    ],
    mechanicalOperationsAllowed: 5,
    symbolSlots: createSlots([
      { x: 2, y: 1, connectedGears: ['gear_1'] },
      { x: 4, y: 1, connectedGears: ['gear_1'] },
      { x: 4, y: 3, connectedGears: ['gear_1'] },
      { x: 2, y: 3, connectedGears: ['gear_1'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['AABB is not a palindrome, but rotate once and see what happens!'],
  },

  // Level 52: Three in a Row
  {
    id: 52,
    name: 'Three in a Row',
    description: 'A simple 3-symbol gear puzzle.',
    sequence: ['B', 'A', 'B'], // Already palindrome? No wait... BAB is palindrome!
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: null,
    bonusObjectives: [],
    difficulty: 'tutorial',
    mechanicalElements: [
      createGear('gear_1', 3, 2, [0, 1, 2]),
    ],
    mechanicalOperationsAllowed: 5,
    symbolSlots: createSlots([
      { x: 2, y: 2, connectedGears: ['gear_1'] },
      { x: 3, y: 1, connectedGears: ['gear_1'] },
      { x: 4, y: 2, connectedGears: ['gear_1'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['This one starts as a palindrome - just click to see how gears work!'],
  },

  // Level 53: Find the Pattern
  {
    id: 53,
    name: 'Find the Pattern',
    description: 'Rotate to find the hidden palindrome!',
    sequence: ['A', 'B', 'A'], // ABA is already palindrome, let's use ABB→BAB→BBA→ABB
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 60,
    bonusObjectives: [],
    difficulty: 'easy',
    mechanicalElements: [
      createGear('gear_1', 3, 2, [0, 1, 2]),
    ],
    mechanicalOperationsAllowed: 3,
    symbolSlots: createSlots([
      { x: 2, y: 2, connectedGears: ['gear_1'] },
      { x: 3, y: 1, connectedGears: ['gear_1'] },
      { x: 4, y: 2, connectedGears: ['gear_1'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['ABA reads the same forwards and backwards!'],
  },

  // Level 54: Number Wheel
  {
    id: 54,
    name: 'Number Wheel',
    description: 'Spin the numbers into a palindrome!',
    sequence: ['1', '1', '2', '2'], // 1122 → 2112 (palindrome!) → 1221 (palindrome!)
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'numbers',
    timeLimit: 60,
    bonusObjectives: [],
    difficulty: 'easy',
    mechanicalElements: [
      createGear('gear_main', 3, 2, [0, 1, 2, 3]),
    ],
    mechanicalOperationsAllowed: 4,
    symbolSlots: createSlots([
      { x: 2, y: 1, connectedGears: ['gear_main'] },
      { x: 4, y: 1, connectedGears: ['gear_main'] },
      { x: 4, y: 3, connectedGears: ['gear_main'] },
      { x: 2, y: 3, connectedGears: ['gear_main'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['1122 is not a palindrome, but 2112 and 1221 are!'],
  },

  // Level 55: Double Gears
  {
    id: 55,
    name: 'Double Gears',
    description: 'Two gears, two groups of symbols!',
    sequence: ['A', 'B', 'B', 'A', 'C', 'C'], // Need ABBA + CC or similar
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [],
    difficulty: 'easy',
    mechanicalElements: [
      createGear('gear_left', 2, 2, [0, 1, 2]),
      createGear('gear_right', 5, 2, [3, 4, 5]),
    ],
    mechanicalOperationsAllowed: 6,
    symbolSlots: createSlots([
      { x: 1, y: 1, connectedGears: ['gear_left'] },
      { x: 2, y: 3, connectedGears: ['gear_left'] },
      { x: 3, y: 1, connectedGears: ['gear_left'] },
      { x: 4, y: 1, connectedGears: ['gear_right'] },
      { x: 5, y: 3, connectedGears: ['gear_right'] },
      { x: 6, y: 1, connectedGears: ['gear_right'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['Rotate each gear independently to align the palindrome'],
  },

  // ============================================
  // PIPE LEVELS (56-60)
  // ============================================

  // Level 56: Pipe Dream
  {
    id: 56,
    name: 'Pipe Dream',
    description: 'Rotate the pipes to complete the flow and move symbols!',
    sequence: ['A', 'B', 'B', 'A'], // Simple palindrome check
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 90,
    bonusObjectives: [],
    difficulty: 'medium',
    mechanicalElements: [
      createPipe('pipe_1', 2, 1, 'corner_se', true),
      createPipe('pipe_2', 3, 1, 'straight_h', false),
      createPipe('pipe_3', 4, 1, 'corner_sw', true),
      createPipe('pipe_4', 2, 2, 'straight_v', false),
      createPipe('pipe_5', 4, 2, 'straight_v', false),
      createGear('gear_1', 3, 2.5, [0, 1, 2, 3]),
    ],
    mechanicalOperationsAllowed: 5,
    symbolSlots: createSlots([
      { x: 1, y: 2, connectedGears: ['gear_1'] },
      { x: 2.5, y: 3, connectedGears: ['gear_1'] },
      { x: 3.5, y: 3, connectedGears: ['gear_1'] },
      { x: 5, y: 2, connectedGears: ['gear_1'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['Rotate pipes to create a connected path, then use the gear'],
  },

  // ============================================
  // BUTTON LEVELS (61-65)
  // ============================================

  // Level 61: Button Basics
  {
    id: 61,
    name: 'Button Basics',
    description: 'Press the button to activate the gear!',
    sequence: ['A', 'B', 'C', 'B', 'A'], // Target: ABCBA
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'letters',
    timeLimit: 60,
    bonusObjectives: [],
    difficulty: 'easy',
    mechanicalElements: [
      createGear('gear_1', 3, 2, [0, 1, 2, 3, 4]),
      createButton('button_1', 3, 4, 'yellow', {
        type: 'rotate_symbols',
        symbolIndices: [0, 1, 2, 3, 4],
        direction: 'clockwise',
      }),
    ],
    mechanicalOperationsAllowed: 4,
    symbolSlots: createSlots([
      { x: 1, y: 2, connectedGears: ['gear_1'] },
      { x: 2, y: 1, connectedGears: ['gear_1'] },
      { x: 3, y: 2, connectedGears: ['gear_1'] },
      { x: 4, y: 1, connectedGears: ['gear_1'] },
      { x: 5, y: 2, connectedGears: ['gear_1'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['The button rotates all symbols - use the gear for fine control'],
  },

  // Level 62: Dual Buttons
  {
    id: 62,
    name: 'Dual Buttons',
    description: 'Different buttons, different effects!',
    sequence: ['1', '2', '3', '4', '3', '2', '1'], // Target: 1234321
    targetPalindrome: null,
    maxOperations: 5,
    symbolCategory: 'numbers',
    timeLimit: 90,
    bonusObjectives: [],
    difficulty: 'medium',
    mechanicalElements: [
      createButton('button_left', 1, 4, 'blue', {
        type: 'rotate_symbols',
        symbolIndices: [0, 1, 2],
        direction: 'clockwise',
      }),
      createButton('button_right', 5, 4, 'yellow', {
        type: 'rotate_symbols',
        symbolIndices: [4, 5, 6],
        direction: 'counterclockwise',
      }),
      createGear('gear_center', 3, 2, [2, 3, 4]),
    ],
    mechanicalOperationsAllowed: 6,
    symbolSlots: createSlots([
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 2.5, y: 1, connectedGears: ['gear_center'] },
      { x: 3, y: 2, connectedGears: ['gear_center'] },
      { x: 3.5, y: 1, connectedGears: ['gear_center'] },
      { x: 4, y: 2 },
      { x: 5, y: 1 },
    ]),
    goalCondition: { type: 'palindrome' },
  },

  // ============================================
  // COMBINATION LEVELS (66-70)
  // ============================================

  // Level 66: The Machine
  {
    id: 66,
    name: 'The Machine',
    description: 'All mechanisms working together!',
    sequence: ['P', 'A', 'L', 'I', 'N', 'D', 'R', 'O', 'M', 'E'],
    targetPalindrome: null,
    maxOperations: 10,
    symbolCategory: 'letters',
    timeLimit: 180,
    bonusObjectives: [],
    difficulty: 'hard',
    mechanicalElements: [
      createGear('gear_1', 2, 2, [0, 1, 2, 3, 4]),
      createGear('gear_2', 6, 2, [5, 6, 7, 8, 9]),
      createButton('button_swap', 4, 4, 'yellow', {
        type: 'swap_symbols',
        symbolIndices: [4, 5],
      }),
      createPipe('pipe_1', 3, 1, 'straight_h', false),
      createPipe('pipe_2', 5, 1, 'straight_h', false),
    ],
    mechanicalOperationsAllowed: 10,
    symbolSlots: createSlots([
      { x: 0.5, y: 1, connectedGears: ['gear_1'] },
      { x: 1.5, y: 2, connectedGears: ['gear_1'] },
      { x: 2, y: 1, connectedGears: ['gear_1'] },
      { x: 2.5, y: 2, connectedGears: ['gear_1'] },
      { x: 3.5, y: 1, connectedGears: ['gear_1'] },
      { x: 4.5, y: 1, connectedGears: ['gear_2'] },
      { x: 5.5, y: 2, connectedGears: ['gear_2'] },
      { x: 6, y: 1, connectedGears: ['gear_2'] },
      { x: 6.5, y: 2, connectedGears: ['gear_2'] },
      { x: 7.5, y: 1, connectedGears: ['gear_2'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['Use the swap button to exchange the middle elements'],
  },

  // Level 67: Clockwork
  {
    id: 67,
    name: 'Clockwork',
    description: 'Precise timing and coordination needed.',
    sequence: ['A', 'B', 'C', 'D', 'E', 'F', 'E', 'D', 'C', 'B', 'A'], // Target: ABCDEFEDCBA
    targetPalindrome: null,
    maxOperations: 8,
    symbolCategory: 'letters',
    timeLimit: 150,
    bonusObjectives: [],
    difficulty: 'hard',
    mechanicalElements: [
      createGear('gear_outer_left', 1.5, 2, [0, 1, 2]),
      createGear('gear_center', 5, 2, [3, 4, 5, 6, 7], 'large'),
      createGear('gear_outer_right', 8.5, 2, [8, 9, 10]),
    ],
    mechanicalOperationsAllowed: 8,
    symbolSlots: createSlots([
      { x: 0.5, y: 1, connectedGears: ['gear_outer_left'] },
      { x: 1.5, y: 3, connectedGears: ['gear_outer_left'] },
      { x: 2.5, y: 1, connectedGears: ['gear_outer_left'] },
      { x: 3.5, y: 1, connectedGears: ['gear_center'] },
      { x: 4.5, y: 2.5, connectedGears: ['gear_center'] },
      { x: 5, y: 1, connectedGears: ['gear_center'] },
      { x: 5.5, y: 2.5, connectedGears: ['gear_center'] },
      { x: 6.5, y: 1, connectedGears: ['gear_center'] },
      { x: 7.5, y: 1, connectedGears: ['gear_outer_right'] },
      { x: 8.5, y: 3, connectedGears: ['gear_outer_right'] },
      { x: 9.5, y: 1, connectedGears: ['gear_outer_right'] },
    ]),
    goalCondition: { type: 'palindrome' },
  },

  // Level 70: Mechanical Master
  {
    id: 70,
    name: 'Mechanical Master',
    description: 'The ultimate mechanical challenge!',
    sequence: ['M', 'E', 'C', 'H', 'A', 'N', 'I', 'C', 'A', 'L'],
    targetPalindrome: null,
    maxOperations: 12,
    symbolCategory: 'letters',
    timeLimit: 240,
    bonusObjectives: [],
    difficulty: 'expert',
    mechanicalElements: [
      createGear('gear_1', 2, 1.5, [0, 1, 2]),
      createGear('gear_2', 4, 2.5, [2, 3, 4, 5]),
      createGear('gear_3', 6, 1.5, [5, 6, 7]),
      createGear('gear_4', 8, 2.5, [7, 8, 9]),
      createButton('btn_1', 2, 4, 'blue', {
        type: 'rotate_symbols',
        symbolIndices: [0, 1, 2, 3, 4],
        direction: 'clockwise',
      }),
      createButton('btn_2', 8, 4, 'yellow', {
        type: 'rotate_symbols',
        symbolIndices: [5, 6, 7, 8, 9],
        direction: 'counterclockwise',
      }),
    ],
    mechanicalOperationsAllowed: 12,
    symbolSlots: createSlots([
      { x: 1, y: 1, connectedGears: ['gear_1'] },
      { x: 2, y: 2, connectedGears: ['gear_1'] },
      { x: 3, y: 1, connectedGears: ['gear_1', 'gear_2'] },
      { x: 3.5, y: 2.5, connectedGears: ['gear_2'] },
      { x: 4, y: 1, connectedGears: ['gear_2'] },
      { x: 5, y: 2, connectedGears: ['gear_2', 'gear_3'] },
      { x: 6, y: 1, connectedGears: ['gear_3'] },
      { x: 7, y: 2, connectedGears: ['gear_3', 'gear_4'] },
      { x: 8, y: 1, connectedGears: ['gear_4'] },
      { x: 9, y: 2, connectedGears: ['gear_4'] },
    ]),
    goalCondition: { type: 'palindrome' },
    hints: ['The gears share some slots - plan your moves carefully!'],
  },
];

// Helper functions
export const getMechanicalLevelById = (id: number): MechanicalLevelConfig | undefined => {
  return MECHANICAL_LEVELS.find((level) => level.id === id);
};

export const getMechanicalLevelsByDifficulty = (
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert'
): MechanicalLevelConfig[] => {
  return MECHANICAL_LEVELS.filter((level) => level.difficulty === difficulty);
};

export const getTotalMechanicalLevels = (): number => {
  return MECHANICAL_LEVELS.length;
};
