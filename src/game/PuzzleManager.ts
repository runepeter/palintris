import type {
  LevelConfig,
  LevelResult,
  OperationType,
  OperationRecord,
  PuzzleState,
} from '../types';
import {
  isPalindrome,
  applySwap,
  applyRotate,
  applyMirror,
  applyInsert,
  applyDelete,
  applyReplace,
} from '../utils/palindrome';
import { SCORING } from '../config/gameConfig';

export class PuzzleManager {
  private state: PuzzleState;
  private levelConfig: LevelConfig;
  private startTime: number;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private onTimeExpired: (() => void) | null = null;

  constructor(levelConfig: LevelConfig) {
    this.levelConfig = levelConfig;
    this.startTime = Date.now();

    this.state = {
      sequence: [...levelConfig.sequence],
      originalSequence: [...levelConfig.sequence],
      operationsRemaining: levelConfig.maxOperations,
      operationsUsed: [],
      timeRemaining: levelConfig.timeLimit,
      isComplete: false,
    };

    if (levelConfig.timeLimit !== null) {
      this.startTimer();
    }
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.timeRemaining !== null && this.state.timeRemaining > 0) {
        this.state = {
          ...this.state,
          timeRemaining: this.state.timeRemaining - 1,
        };
        const currentTime = this.state.timeRemaining;
        if (currentTime !== null) {
          this.onTimeUpdate?.(currentTime);
        }

        if (this.state.timeRemaining !== null && this.state.timeRemaining <= 0) {
          this.stopTimer();
          this.onTimeExpired?.();
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public setTimeCallbacks(
    onUpdate: (time: number) => void,
    onExpired: () => void
  ): void {
    this.onTimeUpdate = onUpdate;
    this.onTimeExpired = onExpired;
  }

  public getState(): PuzzleState {
    return { ...this.state };
  }

  public getSequence(): string[] {
    return [...this.state.sequence];
  }

  public canApplyOperation(operation: OperationType): boolean {
    if (this.state.isComplete) return false;
    if (this.state.operationsRemaining <= 0) return false;
    return this.levelConfig.allowedOperations.includes(operation);
  }

  public applyOperation(
    operation: OperationType,
    position: number,
    options?: {
      targetPosition?: number;
      symbol?: string;
      direction?: 'left' | 'right';
      start?: number;
      end?: number;
    }
  ): boolean {
    if (!this.canApplyOperation(operation)) return false;

    let newSequence: string[];

    switch (operation) {
      case 'swap':
        if (options?.targetPosition === undefined) return false;
        newSequence = applySwap(this.state.sequence, position, options.targetPosition);
        break;

      case 'rotate': {
        const start = options?.start ?? 0;
        const end = options?.end ?? this.state.sequence.length - 1;
        const direction = options?.direction ?? 'right';
        newSequence = applyRotate(this.state.sequence, start, end, direction);
        break;
      }

      case 'mirror': {
        const mStart = options?.start ?? 0;
        const mEnd = options?.end ?? this.state.sequence.length - 1;
        newSequence = applyMirror(this.state.sequence, mStart, mEnd);
        break;
      }

      case 'insert':
        if (options?.symbol === undefined) return false;
        newSequence = applyInsert(this.state.sequence, position, options.symbol);
        break;

      case 'delete':
        newSequence = applyDelete(this.state.sequence, position);
        break;

      case 'replace':
        if (options?.symbol === undefined) return false;
        newSequence = applyReplace(this.state.sequence, position, options.symbol);
        break;

      default:
        return false;
    }

    const record: OperationRecord = {
      operation,
      position,
      targetPosition: options?.targetPosition,
      symbol: options?.symbol,
      timestamp: Date.now() - this.startTime,
    };

    this.state = {
      ...this.state,
      sequence: newSequence,
      operationsRemaining: this.state.operationsRemaining - 1,
      operationsUsed: [...this.state.operationsUsed, record],
    };

    // Check if puzzle is solved
    if (this.checkCompletion()) {
      this.state = { ...this.state, isComplete: true };
      this.stopTimer();
    }

    return true;
  }

  public checkCompletion(): boolean {
    const isCurrentPalindrome = isPalindrome(this.state.sequence);

    if (!isCurrentPalindrome) return false;

    // If there's a target palindrome, check if it matches
    if (this.levelConfig.targetPalindrome !== null) {
      return this.arraysEqual(
        this.state.sequence,
        this.levelConfig.targetPalindrome
      );
    }

    return true;
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }

  public getResult(): LevelResult {
    const timeSpent = (Date.now() - this.startTime) / 1000;
    const completed = this.state.isComplete;
    const bonusesAchieved: string[] = [];

    // Check bonus objectives
    for (const bonus of this.levelConfig.bonusObjectives) {
      const result: LevelResult = {
        levelId: this.levelConfig.id,
        completed,
        finalSequence: [...this.state.sequence],
        operationsUsed: [...this.state.operationsUsed],
        timeSpent,
        score: 0,
        bonusesAchieved: [],
        isPalindrome: isPalindrome(this.state.sequence),
      };

      if (bonus.check(result)) {
        bonusesAchieved.push(bonus.id);
      }
    }

    // Calculate score
    let score = 0;
    if (completed) {
      const diffMultiplier =
        SCORING.difficultyMultiplier[this.levelConfig.difficulty];

      score = SCORING.baseComplete * diffMultiplier;
      score += this.state.operationsRemaining * SCORING.operationBonus;

      if (this.state.timeRemaining !== null) {
        score += this.state.timeRemaining * SCORING.timeBonus;
      }

      // Bonus points
      for (const bonusId of bonusesAchieved) {
        const bonus = this.levelConfig.bonusObjectives.find(
          (b) => b.id === bonusId
        );
        if (bonus !== undefined) {
          score += bonus.bonusPoints;
        }
      }
    }

    return {
      levelId: this.levelConfig.id,
      completed,
      finalSequence: [...this.state.sequence],
      operationsUsed: [...this.state.operationsUsed],
      timeSpent,
      score: Math.round(score),
      bonusesAchieved,
      isPalindrome: isPalindrome(this.state.sequence),
    };
  }

  public reset(): void {
    this.stopTimer();
    this.startTime = Date.now();

    this.state = {
      sequence: [...this.levelConfig.sequence],
      originalSequence: [...this.levelConfig.sequence],
      operationsRemaining: this.levelConfig.maxOperations,
      operationsUsed: [],
      timeRemaining: this.levelConfig.timeLimit,
      isComplete: false,
    };

    if (this.levelConfig.timeLimit !== null) {
      this.startTimer();
    }
  }

  public undo(): boolean {
    if (this.state.operationsUsed.length === 0) return false;
    if (this.state.isComplete) return false;

    // Reset and replay all operations except the last one
    const operationsToReplay = this.state.operationsUsed.slice(0, -1);
    this.state = {
      sequence: [...this.levelConfig.sequence],
      originalSequence: [...this.levelConfig.sequence],
      operationsRemaining: this.levelConfig.maxOperations,
      operationsUsed: [],
      timeRemaining: this.state.timeRemaining, // Keep current time
      isComplete: false,
    };

    // Replay operations
    for (const record of operationsToReplay) {
      this.applyOperation(record.operation, record.position, {
        targetPosition: record.targetPosition,
        symbol: record.symbol,
      });
    }

    // Restore one operation
    this.state = {
      ...this.state,
      operationsRemaining: this.state.operationsRemaining + 1,
    };

    return true;
  }

  public destroy(): void {
    this.stopTimer();
  }

  public addOperations(count: number): void {
    this.state = {
      ...this.state,
      operationsRemaining: this.state.operationsRemaining + count,
    };
  }

  public addTime(seconds: number): void {
    if (this.state.timeRemaining !== null) {
      const newTime = this.state.timeRemaining + seconds;
      this.state = {
        ...this.state,
        timeRemaining: newTime,
      };
      this.onTimeUpdate?.(newTime);
    }
  }

  public pauseTimer(): void {
    this.stopTimer();
  }

  public resumeTimer(): void {
    if (this.levelConfig.timeLimit !== null && this.state.timeRemaining !== null && this.state.timeRemaining > 0) {
      this.startTimer();
    }
  }
}
