import { generateNonPalindrome } from '../utils/palindrome';
import { TIME_ATTACK_CONFIG } from '../config/timeAttackConfig';

/**
 * Manages Time Attack mode puzzle generation and difficulty scaling
 */
export class TimeAttackManager {
  private puzzlesSolved: number = 0;
  private currentStreak: number = 0;
  private totalScore: number = 0;
  private availableSymbols: string[] = ['A', 'B', 'C', 'D', 'E'];

  constructor() {
    this.reset();
  }

  /**
   * Reset the manager state
   */
  public reset(): void {
    this.puzzlesSolved = 0;
    this.currentStreak = 0;
    this.totalScore = 0;
  }

  /**
   * Generate a new puzzle based on current difficulty
   */
  public generatePuzzle(): {
    sequence: string[];
    maxMoves: number;
  } {
    const difficulty = this.calculateDifficulty();

    // Calculate sequence length based on difficulty (4-8)
    const length = Math.min(
      TIME_ATTACK_CONFIG.maxSequenceLength,
      TIME_ATTACK_CONFIG.baseSequenceLength + Math.floor(difficulty / 2)
    );

    // Calculate available moves (5 down to 2)
    const maxMoves = Math.max(
      TIME_ATTACK_CONFIG.minMoves,
      TIME_ATTACK_CONFIG.startingMoves - Math.floor(difficulty * TIME_ATTACK_CONFIG.difficultyRampSpeed)
    );

    // Generate symbols pool (expand at higher difficulty)
    const symbolCount = Math.min(5, 3 + Math.floor(difficulty / 3));
    const symbols = this.availableSymbols.slice(0, symbolCount);

    // Generate non-palindrome sequence
    const sequence = generateNonPalindrome(symbols, length);

    return {
      sequence,
      maxMoves,
    };
  }

  /**
   * Calculate current difficulty level
   */
  private calculateDifficulty(): number {
    return Math.floor(this.puzzlesSolved / 3); // Difficulty increases every 3 puzzles
  }

  /**
   * Record a solved puzzle and calculate score
   */
  public recordSolve(timeRemaining: number, movesUsed: number, movesAvailable: number): number {
    this.puzzlesSolved++;
    this.currentStreak++;

    // Base score
    let score = TIME_ATTACK_CONFIG.scoreMultiplierBase;

    // Streak bonus
    const streakBonus = score * (this.currentStreak - 1) * TIME_ATTACK_CONFIG.streakBonusMultiplier;
    score += streakBonus;

    // Efficiency bonus (unused moves)
    const efficiencyBonus = (movesAvailable - movesUsed) * 20;
    score += efficiencyBonus;

    // Time bonus
    const timeBonus = Math.floor(timeRemaining * 5);
    score += timeBonus;

    // Difficulty multiplier
    const difficultyMultiplier = 1 + (this.calculateDifficulty() * 0.1);
    score = Math.floor(score * difficultyMultiplier);

    this.totalScore += score;

    return score;
  }

  /**
   * Reset streak (called when puzzle fails)
   */
  public resetStreak(): void {
    this.currentStreak = 0;
  }

  /**
   * Get current stats
   */
  public getStats(): {
    puzzlesSolved: number;
    currentStreak: number;
    totalScore: number;
    difficulty: number;
  } {
    return {
      puzzlesSolved: this.puzzlesSolved,
      currentStreak: this.currentStreak,
      totalScore: this.totalScore,
      difficulty: this.calculateDifficulty(),
    };
  }
}
