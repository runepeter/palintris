import type { Operation, OperationType } from '../types';

export const OPERATIONS: Record<OperationType, Operation> = {
  swap: {
    type: 'swap',
    name: 'Swap',
    description: 'Swap two adjacent symbols',
    cost: 0,
    icon: '⇄',
  },
  rotate: {
    type: 'rotate',
    name: 'Rotate',
    description: 'Rotate a section of symbols left or right',
    cost: 0,
    icon: '↻',
  },
  mirror: {
    type: 'mirror',
    name: 'Mirror',
    description: 'Mirror symbols around a pivot point',
    cost: 0,
    icon: '⧓',
  },
  insert: {
    type: 'insert',
    name: 'Insert',
    description: 'Insert a new symbol at a position',
    cost: 50,
    icon: '+',
  },
  delete: {
    type: 'delete',
    name: 'Delete',
    description: 'Remove a symbol from the sequence',
    cost: 50,
    icon: '−',
  },
  replace: {
    type: 'replace',
    name: 'Replace',
    description: 'Replace a symbol with another',
    cost: 25,
    icon: '↔',
  },
};

// Get operations available at each difficulty level
export const getOperationsForDifficulty = (
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert'
): OperationType[] => {
  switch (difficulty) {
    case 'tutorial':
      return ['swap'];
    case 'easy':
      return ['swap', 'rotate'];
    case 'medium':
      return ['swap', 'rotate', 'mirror'];
    case 'hard':
      return ['swap', 'rotate', 'mirror', 'insert', 'delete'];
    case 'expert':
      return ['swap', 'rotate', 'mirror', 'insert', 'delete', 'replace'];
  }
};

// Validate if an operation can be applied
export const canApplyOperation = (
  operation: OperationType,
  sequenceLength: number,
  position: number,
  targetPosition?: number
): boolean => {
  switch (operation) {
    case 'swap':
      // Need at least 2 elements, and target must be adjacent
      if (targetPosition === undefined) return false;
      return (
        sequenceLength >= 2 &&
        position >= 0 &&
        position < sequenceLength &&
        targetPosition >= 0 &&
        targetPosition < sequenceLength &&
        Math.abs(position - targetPosition) === 1
      );

    case 'rotate':
      // Need at least 3 elements to make rotation meaningful
      return sequenceLength >= 3;

    case 'mirror':
      // Need at least 2 elements
      return sequenceLength >= 2;

    case 'insert':
      // Can always insert if sequence isn't too long
      return sequenceLength < 15;

    case 'delete':
      // Need at least 2 elements to delete
      return sequenceLength > 1 && position >= 0 && position < sequenceLength;

    case 'replace':
      // Can replace any position
      return position >= 0 && position < sequenceLength;
  }
};
