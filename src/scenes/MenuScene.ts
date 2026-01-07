import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { loadGameState } from '../utils/storage';
import { getTotalLevels } from '../config/levels';
import { audio } from '../utils/audio';

// Available tile sprites for background
const BACKGROUND_TILES = [
  'tile_blue_circle', 'tile_red_square', 'tile_green_triangle',
  'tile_yellow_diamond', 'tile_orange_star', 'tile_pink_heart',
  'tile_grey_hexagon', 'tile_blue_star', 'tile_red_diamond',
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const gameState = loadGameState();

    // Start menu music
    audio.startMusic('menu');

    // Create animated background first
    this.createBackgroundAnimation();

    // Dark gradient overlay for readability
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 0.85);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title with glow effect
    const titleGlow = this.add.text(GAME_WIDTH / 2, 122, 'PALINTRIS', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '68px',
      fontStyle: 'bold',
      color: '#4488ff',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setAlpha(0.5);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    const title = this.add.text(GAME_WIDTH / 2, 120, 'PALINTRIS', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '68px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#4488ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5, 0.5);

    // Animate title
    this.tweens.add({
      targets: [title, titleGlow],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subtitle = this.add.text(
      GAME_WIDTH / 2,
      185,
      'A Palindrome Puzzle Game',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#8899bb',
      }
    );
    subtitle.setOrigin(0.5, 0.5);

    // Progress bar background
    const progressBarWidth = 300;
    const progressBarHeight = 20;
    const progressBarX = GAME_WIDTH / 2 - progressBarWidth / 2;
    const progressBarY = 230;

    const completedLevels = gameState.levelsCompleted.length;
    const totalLevels = getTotalLevels();
    const progressPercent = completedLevels / totalLevels;

    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x2a2a4a, 1);
    progressBg.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 10);

    const progressFill = this.add.graphics();
    progressFill.fillStyle(0x44cc88, 1);
    progressFill.fillRoundedRect(progressBarX, progressBarY, progressBarWidth * progressPercent, progressBarHeight, 10);

    // Progress text
    const progressText = this.add.text(
      GAME_WIDTH / 2,
      progressBarY + progressBarHeight + 15,
      `${completedLevels}/${totalLevels} levels completed`,
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888899',
      }
    );
    progressText.setOrigin(0.5, 0.5);

    // Score with coin icon
    const scoreContainer = this.add.container(GAME_WIDTH / 2, 290);

    if (this.textures.exists('coin_gold')) {
      const coinIcon = this.add.image(-80, 0, 'coin_gold');
      coinIcon.setScale(0.4);
      scoreContainer.add(coinIcon);
    }

    const scoreText = this.add.text(
      0,
      0,
      `${gameState.totalScore.toLocaleString()}`,
      {
        fontFamily: 'Arial Black, Arial',
        fontSize: '24px',
        color: '#ffd700',
      }
    );
    scoreText.setOrigin(0.5, 0.5);
    scoreContainer.add(scoreText);

    // Menu buttons
    const buttonY = 380;
    const buttonSpacing = 75;

    this.createButton(GAME_WIDTH / 2, buttonY, 'PLAY', 0x44cc88, () => {
      this.scene.start('LevelSelectScene');
    });

    this.createButton(
      GAME_WIDTH / 2,
      buttonY + buttonSpacing,
      'HOW TO PLAY',
      0x4488ff,
      () => {
        this.scene.start('TutorialScene');
      }
    );

    this.createButton(
      GAME_WIDTH / 2,
      buttonY + buttonSpacing * 2,
      'SETTINGS',
      0x8855cc,
      () => {
        this.scene.start('SettingsScene');
      }
    );

    // Credits with Kenney attribution
    const credits = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 40,
      'Made with Phaser 3',
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#555566',
      }
    );
    credits.setOrigin(0.5, 0.5);

    const assetCredits = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 20,
      'Assets by Kenney.nl',
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#555566',
      }
    );
    assetCredits.setOrigin(0.5, 0.5);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    accentColor: number,
    callback: () => void
  ): void {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a4a, 1);
    bg.fillRoundedRect(-130, -28, 260, 56, 12);
    bg.lineStyle(3, accentColor, 0.8);
    bg.strokeRoundedRect(-130, -28, 260, 56, 12);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '22px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(260, 56);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(accentColor, 0.3);
      bg.fillRoundedRect(-130, -28, 260, 56, 12);
      bg.lineStyle(3, accentColor, 1);
      bg.strokeRoundedRect(-130, -28, 260, 56, 12);
      label.setColor('#ffffff');
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
        ease: 'Back.easeOut',
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4a, 1);
      bg.fillRoundedRect(-130, -28, 260, 56, 12);
      bg.lineStyle(3, accentColor, 0.8);
      bg.strokeRoundedRect(-130, -28, 260, 56, 12);
      label.setColor('#ffffff');
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
  }

  private createBackgroundAnimation(): void {
    // Create floating tile sprites in background
    for (let i = 0; i < 20; i++) {
      const tileKey = BACKGROUND_TILES[Math.floor(Math.random() * BACKGROUND_TILES.length)];

      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const scale = 0.3 + Math.random() * 0.4;
      const startAlpha = 0.1 + Math.random() * 0.15;

      if (tileKey !== undefined && this.textures.exists(tileKey)) {
        const tile = this.add.image(x, y, tileKey);
        tile.setScale(scale);
        tile.setAlpha(startAlpha);
        tile.setAngle(Math.random() * 360);

        // Floating animation
        this.tweens.add({
          targets: tile,
          y: y - 30 + Math.random() * 60,
          x: x - 30 + Math.random() * 60,
          alpha: startAlpha * 0.5 + Math.random() * startAlpha,
          angle: tile.angle + (Math.random() - 0.5) * 30,
          duration: 4000 + Math.random() * 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 2000,
        });
      } else {
        // Fallback to text symbols
        const symbols = ['A', 'B', 'C', '1', '2', '3', '●', '■', '▲'];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        if (symbol === undefined) continue;

        const text = this.add.text(x, y, symbol, {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#333344',
        });
        text.setOrigin(0.5, 0.5);
        text.setAlpha(0.2);

        this.tweens.add({
          targets: text,
          y: y - 20 + Math.random() * 40,
          x: x - 20 + Math.random() * 40,
          alpha: 0.1 + Math.random() * 0.2,
          duration: 3000 + Math.random() * 2000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }
}
