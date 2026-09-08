import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import {
  UNIFIED_LEVELS,
  getUnifiedLevelById,
  isLevelUnlocked,
  getLevelDifficulty,
  isTimeAttackUnlocked,
  isDailyChallengeUnlocked,
} from '../config/unifiedLevels';
import { loadGameState } from '../utils/storage';
import type { Difficulty } from '../types';

export class LevelSelectScene extends Phaser.Scene {
  private currentPage = 0;
  private readonly levelsPerPage = 10;
  private pageContainer: Phaser.GameObjects.Container | null = null;
  private modeButtonsContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    const gameState = loadGameState();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d1117, 0x0d1117, 0x1a1f2e, 0x1a1f2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 30, 'Select Level', {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#f0f6fc',
    });
    title.setOrigin(0.5, 0.5);

    // Back button
    this.createBackButton();

    // Special mode buttons (Time Attack, Daily Challenge)
    this.createModeButtons(gameState.levelsCompleted);

    // Level grid
    this.pageContainer = this.add.container(0, 0);
    this.renderLevelPage(gameState.levelsCompleted);

    // Navigation arrows
    this.createNavigation();
  }

  private createModeButtons(completedLevels: number[]): void {
    this.modeButtonsContainer = this.add.container(GAME_WIDTH / 2, 70);

    const timeAttackUnlocked = isTimeAttackUnlocked(completedLevels);
    const dailyChallengeUnlocked = isDailyChallengeUnlocked(completedLevels);

    // Time Attack button
    const timeAttackBtn = this.createModeButton(
      -100,
      '⏱️ Time Attack',
      timeAttackUnlocked,
      () => {
        if (timeAttackUnlocked) {
          this.scene.start('TimeAttackScene');
        }
      },
      'Unlock at Level 15'
    );

    // Daily Challenge button
    const dailyChallengeBtn = this.createModeButton(
      100,
      '📅 Daily Challenge',
      dailyChallengeUnlocked,
      () => {
        if (dailyChallengeUnlocked) {
          this.scene.start('DailyChallengeScene');
        }
      },
      'Unlock at Level 45'
    );

    this.modeButtonsContainer.add([timeAttackBtn, dailyChallengeBtn]);
  }

  private createModeButton(
    x: number,
    text: string,
    unlocked: boolean,
    onClick: () => void,
    lockText: string
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, 0);

    const bg = this.add.graphics();
    bg.fillStyle(unlocked ? COLORS.primary : COLORS.backgroundLight, 1);
    bg.fillRoundedRect(-85, -17, 170, 34, 6);
    if (unlocked) {
      bg.lineStyle(1, COLORS.accentSecondary, 0.5);
      bg.strokeRoundedRect(-85, -17, 170, 34, 6);
    }

    const label = this.add.text(0, 0, unlocked ? text : `🔒 ${lockText}`, {
      fontFamily: 'Arial',
      fontSize: '13px',
      fontStyle: unlocked ? 'bold' : 'normal',
      color: unlocked ? '#f0f6fc' : '#484f58',
    });
    label.setOrigin(0.5, 0.5);

    container.add([bg, label]);
    container.setSize(170, 34);

    if (unlocked) {
      container.setInteractive({ useHandCursor: true });
      container.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(COLORS.secondary, 1);
        bg.fillRoundedRect(-85, -17, 170, 34, 6);
        bg.lineStyle(1, COLORS.accentSecondary, 0.8);
        bg.strokeRoundedRect(-85, -17, 170, 34, 6);
        this.tweens.add({
          targets: container,
          scaleX: 1.03,
          scaleY: 1.03,
          duration: 100,
        });
      });
      container.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-85, -17, 170, 34, 6);
        bg.lineStyle(1, COLORS.accentSecondary, 0.5);
        bg.strokeRoundedRect(-85, -17, 170, 34, 6);
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      });
      container.on('pointerdown', onClick);
    }

    return container;
  }

  private renderLevelPage(completedLevels: number[]): void {
    if (this.pageContainer === null) return;

    this.pageContainer.removeAll(true);

    const startIndex = this.currentPage * this.levelsPerPage;
    const endIndex = Math.min(startIndex + this.levelsPerPage, UNIFIED_LEVELS.length);

    const gridCols = 5;
    const tileSize = 80;
    const spacing = 20;
    const startX = GAME_WIDTH / 2 - ((gridCols * (tileSize + spacing)) - spacing) / 2 + tileSize / 2;
    const startY = 120;

    for (let i = startIndex; i < endIndex; i++) {
      const level = UNIFIED_LEVELS[i];
      if (level === undefined) continue;

      const col = (i - startIndex) % gridCols;
      const row = Math.floor((i - startIndex) / gridCols);
      const x = startX + col * (tileSize + spacing);
      const y = startY + row * (tileSize + spacing + 20);

      const isCompleted = completedLevels.includes(level.id);
      const unlocked = isLevelUnlocked(level.id, completedLevels);
      const difficulty = getLevelDifficulty(level);

      this.createLevelTile(x, y, level.id, difficulty, isCompleted, unlocked, level.isMilestone, level.type, level.milestoneIcon);
    }

    // Page indicator
    const totalPages = Math.ceil(UNIFIED_LEVELS.length / this.levelsPerPage);
    const pageText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 80,
      `Page ${this.currentPage + 1} of ${totalPages}`,
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#8b949e',
      }
    );
    pageText.setOrigin(0.5, 0.5);
    this.pageContainer.add(pageText);

    // Description
    const descText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 55,
      'Progress through levels to unlock special game modes!',
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#484f58',
      }
    );
    descText.setOrigin(0.5, 0.5);
    this.pageContainer.add(descText);
  }

  private createLevelTile(
    x: number,
    y: number,
    levelId: number,
    difficulty: Difficulty,
    isCompleted: boolean,
    isUnlocked: boolean,
    isMilestone: boolean,
    levelType: string,
    milestoneIcon?: string
  ): void {
    if (this.pageContainer === null) return;

    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    let bgColor = isUnlocked
      ? isCompleted
        ? COLORS.success
        : this.getDifficultyColor(difficulty)
      : 0x444444;

    // Special color for mechanical milestones
    if (isMilestone && levelType === 'mechanical' && isUnlocked) {
      bgColor = 0x8844aa; // Purple for mechanical
    }

    const alpha = isUnlocked ? 1 : 0.5;

    bg.fillStyle(bgColor, alpha);
    bg.fillRoundedRect(-40, -40, 80, 80, 8);

    // Milestone border
    if (isMilestone && isUnlocked) {
      bg.lineStyle(3, 0xffd700, 1); // Gold border for milestones
      bg.strokeRoundedRect(-40, -40, 80, 80, 8);
    } else if (isCompleted) {
      bg.lineStyle(3, 0xffffff, 0.8);
      bg.strokeRoundedRect(-40, -40, 80, 80, 8);
    }

    // Level number
    const levelText = this.add.text(0, isMilestone ? -10 : -5, levelId.toString(), {
      fontFamily: 'Arial',
      fontSize: isMilestone ? '24px' : '28px',
      fontStyle: 'bold',
      color: isUnlocked ? '#ffffff' : '#888888',
    });
    levelText.setOrigin(0.5, 0.5);

    // Milestone icon
    if (isMilestone && milestoneIcon) {
      const iconText = this.add.text(0, 15, milestoneIcon, {
        fontFamily: 'Arial',
        fontSize: '20px',
      });
      iconText.setOrigin(0.5, 0.5);
      container.add(iconText);
    }

    // Difficulty label (only for non-milestone or if not showing icon)
    if (!isMilestone) {
      const diffLabel = this.add.text(0, 25, difficulty.charAt(0).toUpperCase(), {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: isUnlocked ? '#ffffff' : '#666666',
      });
      diffLabel.setOrigin(0.5, 0.5);
      container.add(diffLabel);
    }

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

    container.add([bg, levelText]);
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
        const level = getUnifiedLevelById(levelId);
        if (!level) return;

        if (level.type === 'mechanical' && level.mechanicalConfig) {
          this.scene.start('MechanicalGameScene', { levelConfig: level.mechanicalConfig });
        } else if (level.classicConfig) {
          this.scene.start('GameScene', { levelId: level.classicConfig.id });
        }
      });
    }

    this.pageContainer.add(container);
  }

  private getDifficultyColor(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'tutorial':
        return COLORS.difficulty.tutorial;
      case 'easy':
        return COLORS.difficulty.easy;
      case 'medium':
        return COLORS.difficulty.medium;
      case 'hard':
        return COLORS.difficulty.hard;
      case 'expert':
        return COLORS.difficulty.expert;
    }
  }

  private createBackButton(): void {
    const button = this.add.container(60, 30);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-40, -16, 80, 32, 6);
    bg.lineStyle(1, COLORS.secondary, 0.5);
    bg.strokeRoundedRect(-40, -16, 80, 32, 6);

    const label = this.add.text(0, 0, '← Back', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8b949e',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(80, 32);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 1);
      bg.fillRoundedRect(-40, -16, 80, 32, 6);
      bg.lineStyle(1, COLORS.tertiary, 0.7);
      bg.strokeRoundedRect(-40, -16, 80, 32, 6);
      label.setColor('#f0f6fc');
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 1);
      bg.fillRoundedRect(-40, -16, 80, 32, 6);
      bg.lineStyle(1, COLORS.secondary, 0.5);
      bg.strokeRoundedRect(-40, -16, 80, 32, 6);
      label.setColor('#8b949e');
    });

    button.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private createNavigation(): void {
    const totalPages = Math.ceil(UNIFIED_LEVELS.length / this.levelsPerPage);

    // Previous button
    if (this.currentPage > 0) {
      const prevBtn = this.add.text(100, GAME_HEIGHT - 80, '← Previous', {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#8b949e',
      });
      prevBtn.setOrigin(0.5, 0.5);
      prevBtn.setInteractive({ useHandCursor: true });
      prevBtn.on('pointerover', () => prevBtn.setColor('#f0f6fc'));
      prevBtn.on('pointerout', () => prevBtn.setColor('#8b949e'));
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
        fontSize: '15px',
        color: '#8b949e',
      });
      nextBtn.setOrigin(0.5, 0.5);
      nextBtn.setInteractive({ useHandCursor: true });
      nextBtn.on('pointerover', () => nextBtn.setColor('#f0f6fc'));
      nextBtn.on('pointerout', () => nextBtn.setColor('#8b949e'));
      nextBtn.on('pointerdown', () => {
        this.currentPage++;
        const gameState = loadGameState();
        this.renderLevelPage(gameState.levelsCompleted);
      });
    }
  }
}
