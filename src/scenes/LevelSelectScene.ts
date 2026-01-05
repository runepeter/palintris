import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { LEVELS } from '../config/levels';
import { loadGameState } from '../utils/storage';
import type { Difficulty } from '../types';

export class LevelSelectScene extends Phaser.Scene {
  private currentPage = 0;
  private readonly levelsPerPage = 10;
  private pageContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    const gameState = loadGameState();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 50, 'Select Level', {
      fontFamily: 'Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0.5);

    // Back button
    this.createBackButton();

    // Level grid
    this.pageContainer = this.add.container(0, 0);
    this.renderLevelPage(gameState.levelsCompleted);

    // Navigation arrows
    this.createNavigation();
  }

  private renderLevelPage(completedLevels: number[]): void {
    if (this.pageContainer === null) return;

    this.pageContainer.removeAll(true);

    const startIndex = this.currentPage * this.levelsPerPage;
    const endIndex = Math.min(startIndex + this.levelsPerPage, LEVELS.length);

    const gridCols = 5;
    const tileSize = 80;
    const spacing = 20;
    const startX = GAME_WIDTH / 2 - ((gridCols * (tileSize + spacing)) - spacing) / 2 + tileSize / 2;
    const startY = 140;

    for (let i = startIndex; i < endIndex; i++) {
      const level = LEVELS[i];
      if (level === undefined) continue;

      const col = (i - startIndex) % gridCols;
      const row = Math.floor((i - startIndex) / gridCols);
      const x = startX + col * (tileSize + spacing);
      const y = startY + row * (tileSize + spacing + 20);

      const isCompleted = completedLevels.includes(level.id);
      const isUnlocked = level.id === 1 || completedLevels.includes(level.id - 1) || isCompleted;

      this.createLevelTile(x, y, level.id, level.difficulty, isCompleted, isUnlocked);
    }

    // Page indicator
    const totalPages = Math.ceil(LEVELS.length / this.levelsPerPage);
    const pageText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 80,
      `Page ${this.currentPage + 1} of ${totalPages}`,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888',
      }
    );
    pageText.setOrigin(0.5, 0.5);
    this.pageContainer.add(pageText);
  }

  private createLevelTile(
    x: number,
    y: number,
    levelId: number,
    difficulty: Difficulty,
    isCompleted: boolean,
    isUnlocked: boolean
  ): void {
    if (this.pageContainer === null) return;

    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    const bgColor = isUnlocked
      ? isCompleted
        ? COLORS.success
        : this.getDifficultyColor(difficulty)
      : 0x444444;
    const alpha = isUnlocked ? 1 : 0.5;

    bg.fillStyle(bgColor, alpha);
    bg.fillRoundedRect(-40, -40, 80, 80, 8);

    if (isCompleted) {
      bg.lineStyle(3, 0xffffff, 0.8);
      bg.strokeRoundedRect(-40, -40, 80, 80, 8);
    }

    const levelText = this.add.text(0, -5, levelId.toString(), {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: isUnlocked ? '#ffffff' : '#888888',
    });
    levelText.setOrigin(0.5, 0.5);

    // Difficulty label
    const diffLabel = this.add.text(0, 25, difficulty.charAt(0).toUpperCase(), {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: isUnlocked ? '#ffffff' : '#666666',
    });
    diffLabel.setOrigin(0.5, 0.5);

    // Star for completed
    if (isCompleted) {
      const star = this.add.text(25, -28, '★', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffdd00',
      });
      star.setOrigin(0.5, 0.5);
      container.add(star);
    }

    // Lock icon for locked
    if (!isUnlocked) {
      const lock = this.add.text(0, 0, '🔒', {
        fontFamily: 'Arial',
        fontSize: '24px',
      });
      lock.setOrigin(0.5, 0.5);
      lock.setAlpha(0.7);
      container.add(lock);
    }

    container.add([bg, levelText, diffLabel]);
    container.setSize(80, 80);

    if (isUnlocked) {
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        this.tweens.add({
          targets: container,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 100,
        });
      });

      container.on('pointerout', () => {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      });

      container.on('pointerdown', () => {
        this.scene.start('GameScene', { levelId });
      });
    }

    this.pageContainer.add(container);
  }

  private getDifficultyColor(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'tutorial':
        return 0x4caf50;
      case 'easy':
        return 0x8bc34a;
      case 'medium':
        return 0xffc107;
      case 'hard':
        return 0xff9800;
      case 'expert':
        return 0xf44336;
    }
  }

  private createBackButton(): void {
    const button = this.add.container(60, 50);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-40, -20, 80, 40, 8);

    const label = this.add.text(0, 0, '← Back', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(80, 40);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private createNavigation(): void {
    const totalPages = Math.ceil(LEVELS.length / this.levelsPerPage);

    // Previous button
    if (this.currentPage > 0) {
      const prevBtn = this.add.text(100, GAME_HEIGHT - 80, '← Previous', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
      });
      prevBtn.setOrigin(0.5, 0.5);
      prevBtn.setInteractive({ useHandCursor: true });
      prevBtn.on('pointerdown', () => {
        this.currentPage--;
        const gameState = loadGameState();
        this.renderLevelPage(gameState.levelsCompleted);
      });
    }

    // Next button
    if (this.currentPage < totalPages - 1) {
      const nextBtn = this.add.text(GAME_WIDTH - 100, GAME_HEIGHT - 80, 'Next →', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
      });
      nextBtn.setOrigin(0.5, 0.5);
      nextBtn.setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => {
        this.currentPage++;
        const gameState = loadGameState();
        this.renderLevelPage(gameState.levelsCompleted);
      });
    }
  }
}
