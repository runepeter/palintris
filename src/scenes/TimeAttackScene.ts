import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
} from '../config/gameConfig';
import { TIME_ATTACK_CONFIG } from '../config/timeAttackConfig';
import { TimeAttackManager } from '../game/TimeAttackManager';
import { Tile } from '../ui/Tile';
import { isPalindrome, applySwap } from '../utils/palindrome';
import { audio } from '../utils/audio';
import { ParticleEffects } from '../ui/ParticleEffects';
import { loadGameState, saveGameState } from '../utils/storage';
import type { Symbol } from '../types';

export class TimeAttackScene extends Phaser.Scene {
  private manager: TimeAttackManager | null = null;
  private tiles: Tile[] = [];
  private tilesContainer: Phaser.GameObjects.Container | null = null;
  private selectedTileIndex: number | null = null;
  private isAnimating = false;

  // Current puzzle state
  private currentSequence: string[] = [];
  private currentMaxMoves: number = 0;
  private currentMovesUsed: number = 0;

  // Time tracking
  private timeRemaining: number = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // UI elements
  private timerText: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text | null = null;
  private streakText: Phaser.GameObjects.Text | null = null;
  private movesText: Phaser.GameObjects.Text | null = null;
  private puzzleCountText: Phaser.GameObjects.Text | null = null;
  private highScoreText: Phaser.GameObjects.Text | null = null;
  private particles: ParticleEffects | null = null;

  constructor() {
    super({ key: 'TimeAttackScene' });
  }

  create(): void {
    // Start gameplay music
    audio.startMusic('gameplay');

    // Initialize
    this.manager = new TimeAttackManager();
    this.timeRemaining = TIME_ATTACK_CONFIG.startingTime;
    this.tiles = [];
    this.selectedTileIndex = null;
    this.isAnimating = false;

    // Create particle effects
    this.particles = new ParticleEffects(this);
    this.particles.createBackgroundParticles();

    // Background gradient
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
      COLORS.backgroundGradientStart,
      COLORS.backgroundGradientStart,
      COLORS.backgroundGradientEnd,
      COLORS.backgroundGradientEnd,
      1
    );
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 30, 'TIME ATTACK', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#ff00ff',
      stroke: '#ffffff',
      strokeThickness: 2,
    });
    title.setOrigin(0.5, 0.5);

    // Create HUD
    this.createHUD();

    // Create tiles container
    this.tilesContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Create back button
    this.createBackButton();

    // Start timer
    this.startTimer();

    // Generate first puzzle
    this.generateNewPuzzle();

    // Keyboard shortcuts
    this.setupKeyboard();
  }

  private createHUD(): void {
    // Timer (large and prominent)
    const timerBg = this.add.graphics();
    timerBg.fillStyle(COLORS.primary, 0.8);
    timerBg.fillRoundedRect(GAME_WIDTH / 2 - 100, 70, 200, 60, 12);
    timerBg.lineStyle(3, COLORS.warning, 0.8);
    timerBg.strokeRoundedRect(GAME_WIDTH / 2 - 100, 70, 200, 60, 12);

    this.timerText = this.add.text(GAME_WIDTH / 2, 100, '60', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#ffaa00',
    });
    this.timerText.setOrigin(0.5, 0.5);

    // Score
    const scoreLabel = this.add.text(60, 80, 'SCORE', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaaaa',
    });
    scoreLabel.setOrigin(0.5, 0.5);

    this.scoreText = this.add.text(60, 105, '0', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#00ff88',
    });
    this.scoreText.setOrigin(0.5, 0.5);

    // Streak
    const streakLabel = this.add.text(GAME_WIDTH - 60, 80, 'STREAK', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaaaa',
    });
    streakLabel.setOrigin(0.5, 0.5);

    this.streakText = this.add.text(GAME_WIDTH - 60, 105, 'x1', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#ff00ff',
    });
    this.streakText.setOrigin(0.5, 0.5);

    // Moves remaining
    this.movesText = this.add.text(GAME_WIDTH / 2, 160, 'Moves: 5/5', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
    });
    this.movesText.setOrigin(0.5, 0.5);

    // Puzzle count
    this.puzzleCountText = this.add.text(GAME_WIDTH / 2, 185, 'Puzzle #1', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    });
    this.puzzleCountText.setOrigin(0.5, 0.5);

    // High score
    const gameState = loadGameState();
    const highScore = gameState.timeAttackHighScore ?? 0;
    this.highScoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 70, `High Score: ${highScore.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888',
    });
    this.highScoreText.setOrigin(0.5, 0.5);
  }

  private createBackButton(): void {
    const backBtn = this.add.container(80, GAME_HEIGHT - 40);

    const backBg = this.add.graphics();
    backBg.fillStyle(COLORS.primary, 1);
    backBg.fillRoundedRect(-60, -20, 120, 40, 8);

    const backLabel = this.add.text(0, 0, 'Menu', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    backLabel.setOrigin(0.5, 0.5);

    backBtn.add([backBg, backLabel]);
    backBtn.setSize(120, 40);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      audio.playClick();
      this.stopTimer();
      this.scene.start('MenuScene');
    });

    backBtn.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(COLORS.accent, 1);
      backBg.fillRoundedRect(-60, -20, 120, 40, 8);
    });

    backBtn.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(COLORS.primary, 1);
      backBg.fillRoundedRect(-60, -20, 120, 40, 8);
    });
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.timeRemaining > 0) {
        this.timeRemaining--;
        this.updateTimerDisplay();

        // Warning effects when low on time
        if (this.timeRemaining === 10) {
          this.timerText?.setColor('#ff3366');
          audio.playClick(); // Warning sound
        } else if (this.timeRemaining <= 5) {
          this.timerText?.setScale(1.2);
          this.tweens.add({
            targets: this.timerText,
            scale: 1,
            duration: 200,
            ease: 'Bounce.easeOut',
          });
        }
      } else {
        this.onTimeExpired();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(): void {
    if (this.timerText !== null) {
      this.timerText.setText(this.timeRemaining.toString());
    }
  }

  private generateNewPuzzle(): void {
    if (this.manager === null) return;

    // Generate puzzle
    const puzzle = this.manager.generatePuzzle();
    this.currentSequence = puzzle.sequence;
    this.currentMaxMoves = puzzle.maxMoves;
    this.currentMovesUsed = 0;

    // Update HUD
    this.updateHUD();

    // Create tiles
    this.createTiles();
  }

  private createTiles(): void {
    if (this.tilesContainer === null) return;

    // Remove old tiles with animation
    for (const tile of this.tiles) {
      this.tweens.add({
        targets: tile,
        alpha: 0,
        scale: 0.5,
        duration: 150,
        onComplete: () => tile.destroy(),
      });
    }
    this.tiles = [];

    // Small delay before creating new tiles
    this.time.delayedCall(200, () => {
      const totalWidth = this.currentSequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
      const startX = -totalWidth / 2 + TILE_SIZE / 2;

      for (let i = 0; i < this.currentSequence.length; i++) {
        const display = this.currentSequence[i];
        if (display === undefined) continue;

        const symbol: Symbol = {
          id: `symbol_${display}`,
          display,
          category: 'letters',
          color: COLORS.accent,
        };

        const tile = new Tile(
          this,
          startX + i * (TILE_SIZE + TILE_SPACING),
          0,
          symbol,
          i
        );

        tile.on('pointerdown', () => this.onTileClick(i));

        // Entrance animation
        tile.setAlpha(0);
        tile.setScale(0.5);
        this.tweens.add({
          targets: tile,
          alpha: 1,
          scale: 1,
          duration: 200,
          delay: i * 50,
          ease: 'Back.easeOut',
        });

        this.tiles.push(tile);
        if (this.tilesContainer !== null) {
          this.tilesContainer.add(tile);
        }
      }

      this.updatePalindromeHighlight();
    });
  }

  private onTileClick(index: number): void {
    if (this.isAnimating) return;

    const tile = this.tiles[index];
    if (tile === undefined) return;

    if (this.selectedTileIndex === null) {
      // First selection
      this.selectedTileIndex = index;
      tile.select();
      this.highlightAdjacentTiles(index);
    } else if (Math.abs(this.selectedTileIndex - index) === 1) {
      // Adjacent tile selected - perform swap
      this.performSwap(this.selectedTileIndex, index);
    } else {
      // Non-adjacent - reselect
      this.clearSelection();
      this.selectedTileIndex = index;
      tile.select();
      this.highlightAdjacentTiles(index);
    }
  }

  private highlightAdjacentTiles(index: number): void {
    if (index > 0) {
      this.tiles[index - 1]?.highlight();
    }
    if (index < this.tiles.length - 1) {
      this.tiles[index + 1]?.highlight();
    }
  }

  private clearSelection(): void {
    this.selectedTileIndex = null;
    for (const tile of this.tiles) {
      tile.deselect();
      tile.unhighlight();
    }
  }

  private performSwap(pos1: number, pos2: number): void {
    if (this.isAnimating) return;

    this.currentMovesUsed++;
    this.currentSequence = applySwap(this.currentSequence, pos1, pos2);

    this.isAnimating = true;
    audio.playSwap();

    const tile1 = this.tiles[pos1];
    const tile2 = this.tiles[pos2];

    if (tile1 !== undefined && tile2 !== undefined) {
      const x1 = tile1.x;
      const x2 = tile2.x;

      // Particle effect
      if (this.particles !== null && this.tilesContainer !== null) {
        const worldPos1 = this.tilesContainer.getWorldTransformMatrix().transformPoint(x1, 0);
        const worldPos2 = this.tilesContainer.getWorldTransformMatrix().transformPoint(x2, 0);
        const containerY = this.tilesContainer.y;

        if (worldPos1 !== undefined && worldPos2 !== undefined) {
          this.particles.swapEffect(
            worldPos1.x, containerY,
            worldPos2.x, containerY,
            COLORS.accentSecondary,
            COLORS.accent
          );
        }
      }

      tile1.animateSwapTo(x2);
      tile2.animateSwapTo(x1, () => {
        // Swap in array
        this.tiles[pos1] = tile2;
        this.tiles[pos2] = tile1;
        tile1.setIndex(pos2);
        tile2.setIndex(pos1);

        this.isAnimating = false;
        this.clearSelection();
        this.updateAfterMove();
      });
    }

    this.updateHUD();
  }

  private updateAfterMove(): void {
    this.updatePalindromeHighlight();

    // Check for completion
    if (isPalindrome(this.currentSequence)) {
      this.onPuzzleSolved();
    } else if (this.currentMovesUsed >= this.currentMaxMoves) {
      // Out of moves - puzzle failed, reset streak but continue
      if (this.manager !== null) {
        this.manager.resetStreak();
        this.updateHUD();
      }
      audio.playFailure();
      this.shakeTiles();
      this.generateNewPuzzle();
    }
  }

  private updatePalindromeHighlight(): void {
    const isPalin = isPalindrome(this.currentSequence);

    for (const tile of this.tiles) {
      if (isPalin) {
        tile.showPalindromeHighlight();
      } else {
        tile.hidePalindromeHighlight();
      }
    }
  }

  private shakeTiles(): void {
    for (const tile of this.tiles) {
      tile.shake();
    }
  }

  private onPuzzleSolved(): void {
    if (this.manager === null) return;

    audio.playSuccess();

    // Record solve and get score
    const puzzleScore = this.manager.recordSolve(
      this.timeRemaining,
      this.currentMovesUsed,
      this.currentMaxMoves
    );

    // Add bonus time
    this.timeRemaining += TIME_ATTACK_CONFIG.bonusTimePerSolve;
    this.updateTimerDisplay();

    // Celebration particles
    if (this.particles !== null) {
      this.particles.celebrationBurst(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }

    // Show score popup
    this.showScorePopup(puzzleScore);

    // Update HUD
    this.updateHUD();

    // Generate next puzzle
    this.time.delayedCall(800, () => {
      this.generateNewPuzzle();
    });
  }

  private showScorePopup(score: number): void {
    const popup = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, `+${score}`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '48px',
      color: '#00ff88',
      stroke: '#ffffff',
      strokeThickness: 3,
    });
    popup.setOrigin(0.5, 0.5);
    popup.setAlpha(0);

    this.tweens.add({
      targets: popup,
      alpha: 1,
      y: popup.y - 50,
      scale: { from: 0.5, to: 1.5 },
      duration: 600,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: popup,
          alpha: 0,
          duration: 200,
          onComplete: () => popup.destroy(),
        });
      },
    });
  }

  private updateHUD(): void {
    if (this.manager === null) return;

    const stats = this.manager.getStats();

    // Update score
    if (this.scoreText !== null) {
      this.scoreText.setText(stats.totalScore.toLocaleString());
    }

    // Update streak
    if (this.streakText !== null) {
      const streakMultiplier = stats.currentStreak;
      this.streakText.setText(`x${streakMultiplier}`);

      // Color based on streak
      if (streakMultiplier >= 10) {
        this.streakText.setColor('#ffd700'); // Gold
      } else if (streakMultiplier >= 5) {
        this.streakText.setColor('#ff00ff'); // Magenta
      } else {
        this.streakText.setColor('#00ffff'); // Cyan
      }
    }

    // Update moves
    if (this.movesText !== null) {
      const movesRemaining = this.currentMaxMoves - this.currentMovesUsed;
      this.movesText.setText(`Moves: ${movesRemaining}/${this.currentMaxMoves}`);

      // Color based on moves
      if (movesRemaining <= 1) {
        this.movesText.setColor('#ff3366');
      } else if (movesRemaining <= 2) {
        this.movesText.setColor('#ffaa00');
      } else {
        this.movesText.setColor('#ffffff');
      }
    }

    // Update puzzle count
    if (this.puzzleCountText !== null) {
      this.puzzleCountText.setText(`Puzzle #${stats.puzzlesSolved + 1} • Difficulty: ${stats.difficulty}`);
    }
  }

  private onTimeExpired(): void {
    this.stopTimer();
    audio.playFailure();

    if (this.manager === null) return;

    const stats = this.manager.getStats();
    const finalScore = stats.totalScore;

    // Save high score
    const gameState = loadGameState();
    const previousHigh = gameState.timeAttackHighScore ?? 0;
    const isNewRecord = finalScore > previousHigh;

    if (isNewRecord) {
      gameState.timeAttackHighScore = finalScore;
      gameState.timeAttackPuzzlesSolved = Math.max(
        gameState.timeAttackPuzzlesSolved ?? 0,
        stats.puzzlesSolved
      );
      gameState.timeAttackBestStreak = Math.max(
        gameState.timeAttackBestStreak ?? 0,
        stats.currentStreak
      );
      saveGameState(gameState);
    }

    // Show game over modal
    this.showGameOverModal(finalScore, stats.puzzlesSolved, stats.currentStreak, isNewRecord);
  }

  private showGameOverModal(
    finalScore: number,
    puzzlesSolved: number,
    bestStreak: number,
    isNewRecord: boolean
  ): void {
    // Overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-220, -200, 440, 400, 20);
    bg.lineStyle(3, isNewRecord ? COLORS.success : COLORS.error, 1);
    bg.strokeRoundedRect(-220, -200, 440, 400, 20);

    // Title
    const title = this.add.text(
      0,
      -160,
      isNewRecord ? 'NEW RECORD!' : 'TIME\'S UP!',
      {
        fontFamily: 'Arial Black, Arial',
        fontSize: '32px',
        color: isNewRecord ? '#00ff88' : '#ff3366',
      }
    );
    title.setOrigin(0.5, 0.5);

    // Score
    const scoreLabel = this.add.text(0, -100, 'FINAL SCORE', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa',
    });
    scoreLabel.setOrigin(0.5, 0.5);

    const scoreValue = this.add.text(0, -65, finalScore.toLocaleString(), {
      fontFamily: 'Arial Black, Arial',
      fontSize: '42px',
      color: '#00ff88',
    });
    scoreValue.setOrigin(0.5, 0.5);

    // Stats
    const statsText = this.add.text(
      0,
      -5,
      `Puzzles Solved: ${puzzlesSolved}\nBest Streak: x${bestStreak}`,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
      }
    );
    statsText.setOrigin(0.5, 0.5);

    modal.add([bg, title, scoreLabel, scoreValue, statsText]);

    // Buttons
    this.createModalButton(modal, 0, 90, 'TRY AGAIN', () => {
      this.scene.restart();
    });

    this.createModalButton(modal, 0, 150, 'BACK TO MENU', () => {
      this.scene.start('MenuScene');
    });

    // Animate modal
    modal.setScale(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Confetti for new record
    if (isNewRecord && this.particles !== null) {
      this.particles.confettiRain(3000);
    }
  }

  private createModalButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): void {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.secondary, 1);
    bg.fillRoundedRect(-100, -20, 200, 40, 8);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    btn.add([bg, label]);
    btn.setSize(200, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.accent, 1);
      bg.fillRoundedRect(-100, -20, 200, 40, 8);
      btn.setScale(1.05);
    });

    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 1);
      bg.fillRoundedRect(-100, -20, 200, 40, 8);
      btn.setScale(1);
    });

    btn.on('pointerdown', () => {
      audio.playClick();
      callback();
    });

    container.add(btn);
  }

  private setupKeyboard(): void {
    // Escape to pause/quit
    this.input.keyboard?.on('keydown-ESC', () => {
      this.clearSelection();
    });

    // Space to restart
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.timeRemaining <= 0) {
        this.scene.restart();
      }
    });
  }

  shutdown(): void {
    this.stopTimer();
  }
}
