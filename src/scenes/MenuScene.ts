import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { loadGameState } from '../utils/storage';
import { getTotalLevels } from '../config/levels';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const gameState = loadGameState();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 120, 'PALINTRIS', {
      fontFamily: 'Arial',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0.5);

    // Add gradient effect with tween
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subtitle = this.add.text(
      GAME_WIDTH / 2,
      180,
      'A Palindrome Puzzle Game',
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#aaaaaa',
      }
    );
    subtitle.setOrigin(0.5, 0.5);

    // Progress info
    const completedLevels = gameState.levelsCompleted.length;
    const totalLevels = getTotalLevels();
    const progressText = this.add.text(
      GAME_WIDTH / 2,
      220,
      `Progress: ${completedLevels}/${totalLevels} levels completed`,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888',
      }
    );
    progressText.setOrigin(0.5, 0.5);

    // Score
    const scoreText = this.add.text(
      GAME_WIDTH / 2,
      250,
      `Total Score: ${gameState.totalScore.toLocaleString()}`,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888',
      }
    );
    scoreText.setOrigin(0.5, 0.5);

    // Menu buttons
    const buttonY = 350;
    const buttonSpacing = 70;

    this.createButton(GAME_WIDTH / 2, buttonY, 'Play', () => {
      this.scene.start('LevelSelectScene');
    });

    this.createButton(
      GAME_WIDTH / 2,
      buttonY + buttonSpacing,
      'How to Play',
      () => {
        this.scene.start('TutorialScene');
      }
    );

    this.createButton(
      GAME_WIDTH / 2,
      buttonY + buttonSpacing * 2,
      'Settings',
      () => {
        this.scene.start('SettingsScene');
      }
    );

    // Credits
    const credits = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 30,
      'Made with Phaser 3',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#666666',
      }
    );
    credits.setOrigin(0.5, 0.5);

    // Animate tiles in background
    this.createBackgroundAnimation();
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): void {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-120, -25, 240, 50, 10);
    bg.lineStyle(2, COLORS.accent, 1);
    bg.strokeRoundedRect(-120, -25, 240, 50, 10);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(240, 50);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 1);
      bg.fillRoundedRect(-120, -25, 240, 50, 10);
      bg.lineStyle(3, COLORS.accent, 1);
      bg.strokeRoundedRect(-120, -25, 240, 50, 10);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 1);
      bg.fillRoundedRect(-120, -25, 240, 50, 10);
      bg.lineStyle(2, COLORS.accent, 1);
      bg.strokeRoundedRect(-120, -25, 240, 50, 10);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    button.on('pointerdown', callback);
  }

  private createBackgroundAnimation(): void {
    const symbols = ['A', 'B', 'C', '1', '2', '3', '●', '■', '▲'];

    // Create floating symbols in background
    for (let i = 0; i < 15; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      if (symbol === undefined) continue;

      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;

      const text = this.add.text(x, y, symbol, {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#333344',
      });
      text.setOrigin(0.5, 0.5);
      text.setAlpha(0.3);

      // Floating animation
      this.tweens.add({
        targets: text,
        y: y - 20 + Math.random() * 40,
        x: x - 20 + Math.random() * 40,
        alpha: 0.1 + Math.random() * 0.3,
        duration: 3000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
