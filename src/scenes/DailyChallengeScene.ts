import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
} from '../config/gameConfig';
import { generateDailyChallenge, getTodayDateString } from '../game/DailyChallengeGenerator';
import {
  calculateDailyChallengeReward,
} from '../config/dailyChallengeConfig';
import { PuzzleManager } from '../game/PuzzleManager';
import { Tile } from '../ui/Tile';
import { OperationPanel } from '../ui/OperationPanel';
import { HUD } from '../ui/HUD';
import { isPalindrome } from '../utils/palindrome';
import { audio } from '../utils/audio';
import { ParticleEffects } from '../ui/ParticleEffects';
import { getSymbolByDisplay } from '../config/symbols';
import {
  completeDailyChallenge,
  getDailyChallengeStats,
  hasDailyChallengeBeenAttemptedToday,
  addScore,
  addTokens,
  incrementPalindromesFound,
} from '../utils/storage';
import type { LevelConfig, LevelResult } from '../types';

export class DailyChallengeScene extends Phaser.Scene {
  private levelConfig: LevelConfig | null = null;
  private puzzleManager: PuzzleManager | null = null;
  private tiles: Tile[] = [];
  private selectedTileIndex: number | null = null;
  private operationPanel: OperationPanel | null = null;
  private hud: HUD | null = null;
  private isAnimating = false;
  private tilesContainer: Phaser.GameObjects.Container | null = null;
  private particles: ParticleEffects | null = null;
  private hasAlreadyPlayed = false;
  private isPuzzleActive = false;

  constructor() {
    super({ key: 'DailyChallengeScene' });
  }

  create(): void {
    // Check if already completed today
    this.hasAlreadyPlayed = hasDailyChallengeBeenAttemptedToday();

    // Start gameplay music
    audio.startMusic('gameplay');

    // Reset state
    this.tiles = [];
    this.selectedTileIndex = null;
    this.isAnimating = false;
    this.isPuzzleActive = !this.hasAlreadyPlayed;

    // Create particle effects
    this.particles = new ParticleEffects(this);

    // Background particles for atmosphere
    this.particles.createBackgroundParticles();

    // Generate today's challenge
    const todayDate = getTodayDateString();
    this.levelConfig = generateDailyChallenge(todayDate);

    // Show completion screen if already played
    if (this.hasAlreadyPlayed) {
      this.showAlreadyCompletedScreen();
      return;
    }

    // Create puzzle manager
    this.puzzleManager = new PuzzleManager(this.levelConfig);
    this.puzzleManager.setTimeCallbacks(
      (time) => this.hud?.updateTimer(time),
      () => this.onTimeExpired()
    );

    // Create HUD
    this.hud = new HUD(this, 40, this.levelConfig);

    // Create streak and stats display
    this.createStatsDisplay();

    // Create tiles container
    this.tilesContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

    // Create tiles
    this.createTiles();

    // Create operation panel
    this.operationPanel = new OperationPanel(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 120,
      this.levelConfig.allowedOperations
    );

    // Default select first operation
    if (this.levelConfig.allowedOperations.length > 0) {
      const firstOp = this.levelConfig.allowedOperations[0];
      if (firstOp !== undefined) {
        this.operationPanel.selectOperation(firstOp);
      }
    }

    // Create action buttons
    this.createActionButtons();

    // Level description
    this.createLevelDescription();

    // Keyboard shortcuts
    this.setupKeyboard();
  }

  private createStatsDisplay(): void {
    const stats = getDailyChallengeStats();

    // Streak display
    const streakContainer = this.add.container(GAME_WIDTH - 120, 40);

    const streakBg = this.add.graphics();
    streakBg.fillStyle(COLORS.ui.panel, 0.8);
    streakBg.fillRoundedRect(-60, -25, 120, 50, 10);
    streakBg.lineStyle(2, COLORS.accent, 0.8);
    streakBg.strokeRoundedRect(-60, -25, 120, 50, 10);
    streakContainer.add(streakBg);

    const fireIcon = this.add.text(0, -10, '🔥', {
      fontSize: '20px',
    });
    fireIcon.setOrigin(0.5, 0.5);
    streakContainer.add(fireIcon);

    const streakText = this.add.text(0, 10, `${stats.streak} day${stats.streak !== 1 ? 's' : ''}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });
    streakText.setOrigin(0.5, 0.5);
    streakContainer.add(streakText);

    // Best score display
    if (stats.bestScore > 0) {
      const bestScoreText = this.add.text(GAME_WIDTH - 120, 105, `Best: ${stats.bestScore}`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffd700',
      });
      bestScoreText.setOrigin(0.5, 0.5);
    }
  }

  private createLevelDescription(): void {
    if (this.levelConfig === null) return;

    const descBg = this.add.graphics();
    descBg.fillStyle(COLORS.ui.panel, 0.8);
    descBg.fillRoundedRect(GAME_WIDTH / 2 - 200, 85, 400, 50, 10);

    const title = this.add.text(GAME_WIDTH / 2, 95, this.levelConfig.name, {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0);

    const desc = this.add.text(GAME_WIDTH / 2, 118, this.levelConfig.description, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaacc',
    });
    desc.setOrigin(0.5, 0);
  }

  private createTiles(): void {
    if (this.puzzleManager === null || this.tilesContainer === null) return;

    const sequence = this.puzzleManager.getSequence();
    const totalWidth = sequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = -totalWidth / 2;

    sequence.forEach((displaySymbol, index) => {
      const symbolObj = getSymbolByDisplay(displaySymbol);
      if (!symbolObj) return;

      const x = startX + index * (TILE_SIZE + TILE_SPACING) + TILE_SIZE / 2;
      const tile = new Tile(this, x, 0, symbolObj, index);

      tile.on('clicked', () => this.onTileClicked(index));

      this.tiles.push(tile);
      this.tilesContainer?.add(tile);
    });
  }

  private onTileClicked(index: number): void {
    if (!this.isPuzzleActive || this.isAnimating || this.puzzleManager === null) return;

    const operation = this.operationPanel?.getSelectedOperation();
    if (operation === null || operation === undefined) return;

    // Handle different operations
    if (operation === 'swap') {
      if (this.selectedTileIndex === null) {
        // First selection
        this.selectedTileIndex = index;
        this.tiles[index]?.select();
        audio.playClick();
      } else {
        // Second selection - perform swap
        if (this.selectedTileIndex !== index) {
          this.applyOperation(operation, this.selectedTileIndex, { targetPosition: index });
        }
        this.tiles[this.selectedTileIndex]?.deselect();
        this.selectedTileIndex = null;
      }
    } else {
      // Other operations apply immediately
      this.applyOperation(operation, index);
    }
  }

  private applyOperation(
    operation: string,
    position: number,
    options?: { targetPosition?: number }
  ): void {
    if (this.puzzleManager === null) return;

    const success = this.puzzleManager.applyOperation(
      operation as any,
      position,
      options
    );

    if (success) {
      audio.playSwap();
      this.updateTiles();
      this.hud?.updateOperations(this.puzzleManager.getState().operationsRemaining);

      // Check completion
      if (this.puzzleManager.checkCompletion()) {
        this.onPuzzleComplete();
      }
    } else {
      audio.playError();
    }
  }

  private updateTiles(): void {
    if (this.puzzleManager === null) return;

    const sequence = this.puzzleManager.getSequence();
    this.tiles.forEach((tile, index) => {
      const displaySymbol = sequence[index];
      if (displaySymbol !== undefined) {
        const symbolObj = getSymbolByDisplay(displaySymbol);
        if (symbolObj) {
          tile.setSymbol(symbolObj);
        }
      }
    });

    // Highlight palindrome
    if (isPalindrome(sequence)) {
      this.highlightPalindrome();
    }
  }

  private highlightPalindrome(): void {
    this.tiles.forEach((tile) => {
      tile.showPalindromeHighlight();
    });
  }

  private onPuzzleComplete(): void {
    if (this.puzzleManager === null || this.levelConfig === null) return;

    this.isPuzzleActive = false;
    incrementPalindromesFound();

    const result = this.puzzleManager.getResult();
    const stats = getDailyChallengeStats();

    // Calculate rewards (daily challenge only uses easy/medium/hard)
    const difficulty = this.levelConfig.difficulty as 'easy' | 'medium' | 'hard';
    const reward = calculateDailyChallengeReward(
      difficulty,
      result.score,
      stats.streak + 1 // +1 because we're completing today
    );

    // Award tokens
    addTokens(reward.total);
    addScore(result.score);

    // Mark as completed
    completeDailyChallenge(result.score);

    // Play success sound
    audio.playSuccess();

    // Show completion modal
    this.time.delayedCall(800, () => {
      this.showCompletionModal(result, reward);
    });
  }

  private showCompletionModal(
    result: LevelResult,
    reward: { baseTokens: number; streakBonus: number; total: number }
  ): void {
    // Darken background
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Modal container
    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Modal background
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ui.panel, 1);
    bg.fillRoundedRect(-250, -200, 500, 400, 20);
    bg.lineStyle(4, COLORS.accent, 1);
    bg.strokeRoundedRect(-250, -200, 500, 400, 20);
    modal.add(bg);

    // Title
    const title = this.add.text(0, -160, 'DAILY CHALLENGE COMPLETE!', {
      fontFamily: 'Arial Black',
      fontSize: '26px',
      color: '#00ff88',
    });
    title.setOrigin(0.5, 0.5);
    modal.add(title);

    // Score
    const scoreText = this.add.text(0, -100, `Score: ${result.score.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
    });
    scoreText.setOrigin(0.5, 0.5);
    modal.add(scoreText);

    // Rewards
    let yPos = -50;
    const rewardTitle = this.add.text(0, yPos, 'REWARDS', {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#ffff00',
    });
    rewardTitle.setOrigin(0.5, 0.5);
    modal.add(rewardTitle);

    yPos += 35;
    const baseReward = this.add.text(0, yPos, `Base Tokens: +${reward.baseTokens}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd700',
    });
    baseReward.setOrigin(0.5, 0.5);
    modal.add(baseReward);

    if (reward.streakBonus > 0) {
      yPos += 30;
      const stats = getDailyChallengeStats();
      const streakReward = this.add.text(
        0,
        yPos,
        `Streak Bonus (${stats.streak} days): +${reward.streakBonus}`,
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#ff8800',
        }
      );
      streakReward.setOrigin(0.5, 0.5);
      modal.add(streakReward);
    }

    yPos += 35;
    const divider = this.add.graphics();
    divider.lineStyle(2, COLORS.textMuted, 0.5);
    divider.lineBetween(-150, yPos, 150, yPos);
    modal.add(divider);

    yPos += 25;
    const totalReward = this.add.text(0, yPos, `Total: +${reward.total} tokens`, {
      fontFamily: 'Arial Black',
      fontSize: '20px',
      color: '#00ffff',
    });
    totalReward.setOrigin(0.5, 0.5);
    modal.add(totalReward);

    // Come back tomorrow message
    yPos += 50;
    const comeBackText = this.add.text(0, yPos, 'Come back tomorrow for a new challenge!', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaacc',
    });
    comeBackText.setOrigin(0.5, 0.5);
    modal.add(comeBackText);

    // Back to menu button
    const backButton = this.createModalButton(0, 140, 'BACK TO MENU', COLORS.accent, () => {
      this.scene.start('MenuScene');
    });
    modal.add(backButton);

    // Animate modal in
    modal.setScale(0.8);
    modal.setAlpha(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private showAlreadyCompletedScreen(): void {
    const stats = getDailyChallengeStats();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 100, 'Daily Challenge', {
      fontFamily: 'Arial Black',
      fontSize: '40px',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0.5);

    // Already completed message
    const message = this.add.text(GAME_WIDTH / 2, 180, "You've already completed today's challenge!", {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffff00',
    });
    message.setOrigin(0.5, 0.5);

    // Stats panel
    const statsContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const statsBg = this.add.graphics();
    statsBg.fillStyle(COLORS.ui.panel, 0.9);
    statsBg.fillRoundedRect(-200, -120, 400, 240, 15);
    statsBg.lineStyle(3, COLORS.accent, 0.8);
    statsBg.strokeRoundedRect(-200, -120, 400, 240, 15);
    statsContainer.add(statsBg);

    // Stats title
    const statsTitle = this.add.text(0, -80, 'YOUR STATS', {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#00ffff',
    });
    statsTitle.setOrigin(0.5, 0.5);
    statsContainer.add(statsTitle);

    // Streak
    const streakText = this.add.text(0, -30, `Current Streak: ${stats.streak} day${stats.streak !== 1 ? 's' : ''} 🔥`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ff8800',
    });
    streakText.setOrigin(0.5, 0.5);
    statsContainer.add(streakText);

    // Best score
    const bestScoreText = this.add.text(0, 10, `Best Score: ${stats.bestScore.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffd700',
    });
    bestScoreText.setOrigin(0.5, 0.5);
    statsContainer.add(bestScoreText);

    // Total completed
    const totalText = this.add.text(0, 50, `Total Completed: ${stats.completedDates.length}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#00ff88',
    });
    totalText.setOrigin(0.5, 0.5);
    statsContainer.add(totalText);

    // Come back message
    const comeBackText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 180, 'Come back tomorrow for a new challenge!', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaacc',
    });
    comeBackText.setOrigin(0.5, 0.5);

    // Back button
    this.createButton(GAME_WIDTH / 2, GAME_HEIGHT - 100, 'BACK TO MENU', COLORS.accent, () => {
      this.scene.start('MenuScene');
    });
  }

  private onTimeExpired(): void {
    if (!this.isPuzzleActive) return;

    this.isPuzzleActive = false;
    audio.playError();

    // Show failure modal
    this.time.delayedCall(500, () => {
      this.showFailureModal();
    });
  }

  private showFailureModal(): void {
    // Darken background
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Modal
    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ui.panel, 1);
    bg.fillRoundedRect(-200, -150, 400, 300, 20);
    bg.lineStyle(4, COLORS.error, 1);
    bg.strokeRoundedRect(-200, -150, 400, 300, 20);
    modal.add(bg);

    const title = this.add.text(0, -100, 'TIME UP!', {
      fontFamily: 'Arial Black',
      fontSize: '32px',
      color: '#ff3366',
    });
    title.setOrigin(0.5, 0.5);
    modal.add(title);

    const message = this.add.text(0, -30, 'Better luck tomorrow!', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
    });
    message.setOrigin(0.5, 0.5);
    modal.add(message);

    const encouragement = this.add.text(0, 10, 'Come back for a new challenge!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaacc',
    });
    encouragement.setOrigin(0.5, 0.5);
    modal.add(encouragement);

    const backButton = this.createModalButton(0, 80, 'BACK TO MENU', COLORS.accent, () => {
      this.scene.start('MenuScene');
    });
    modal.add(backButton);

    // Animate
    modal.setScale(0.8);
    modal.setAlpha(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private createActionButtons(): void {
    // Back button
    this.createButton(80, GAME_HEIGHT - 50, 'BACK', COLORS.ui.button, () => {
      this.scene.start('MenuScene');
    });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-60, -20, 120, 40, 10);
    bg.lineStyle(2, COLORS.accent, 0.8);
    bg.strokeRoundedRect(-60, -20, 120, 40, 10);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(120, 40);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.8);
      bg.fillRoundedRect(-60, -20, 120, 40, 10);
      bg.lineStyle(2, COLORS.accent, 1);
      bg.strokeRoundedRect(-60, -20, 120, 40, 10);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(-60, -20, 120, 40, 10);
      bg.lineStyle(2, COLORS.accent, 0.8);
      bg.strokeRoundedRect(-60, -20, 120, 40, 10);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    button.on('pointerdown', () => {
      audio.playClick();
      callback();
    });

    return button;
  }

  private createModalButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(color, 0.3);
    bg.fillRoundedRect(-100, -25, 200, 50, 12);
    bg.lineStyle(3, color, 1);
    bg.strokeRoundedRect(-100, -25, 200, 50, 12);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black',
      fontSize: '18px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(200, 50);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.5);
      bg.fillRoundedRect(-100, -25, 200, 50, 12);
      bg.lineStyle(3, color, 1);
      bg.strokeRoundedRect(-100, -25, 200, 50, 12);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.3);
      bg.fillRoundedRect(-100, -25, 200, 50, 12);
      bg.lineStyle(3, color, 1);
      bg.strokeRoundedRect(-100, -25, 200, 50, 12);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    button.on('pointerdown', () => {
      audio.playClick();
      callback();
    });

    return button;
  }

  private setupKeyboard(): void {
    if (this.input.keyboard === null) return;

    // ESC to go back
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  shutdown(): void {
    this.puzzleManager?.destroy();
  }
}
