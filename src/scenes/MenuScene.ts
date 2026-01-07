import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/gameConfig';
import { loadGameState, hasDailyChallengeBeenAttemptedToday } from '../utils/storage';
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
    overlay.fillGradientStyle(0x0d1117, 0x0d1117, 0x1a1f2e, 0x1a1f2e, 0.92);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title with subtle glow effect
    const titleGlow = this.add.text(GAME_WIDTH / 2, 72, 'PALINTRIS', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#58a6ff',
    });
    titleGlow.setOrigin(0.5, 0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    const title = this.add.text(GAME_WIDTH / 2, 70, 'PALINTRIS', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '52px',
      fontStyle: 'bold',
      color: '#f0f6fc',
      stroke: '#58a6ff',
      strokeThickness: 2,
    });
    title.setOrigin(0.5, 0.5);

    // Subtle breathing animation
    this.tweens.add({
      targets: [title, titleGlow],
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subtitle = this.add.text(
      GAME_WIDTH / 2,
      115,
      'A Palindrome Puzzle Game',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#8b949e',
      }
    );
    subtitle.setOrigin(0.5, 0.5);

    // Stats row - compact horizontal layout
    this.createStatsRow(gameState, 155);

    // === MAIN MENU BUTTONS ===
    // Two-column layout for game modes, single column for utilities
    const leftCol = GAME_WIDTH / 2 - 135;
    const rightCol = GAME_WIDTH / 2 + 135;
    const buttonWidth = 240;
    const buttonHeight = 44;
    const startY = 205;
    const rowSpacing = 54;

    // Row 1: Main play options
    this.createMenuButton(leftCol, startY, buttonWidth, buttonHeight, 'PLAY', COLORS.accentSecondary, () => {
      this.scene.start('LevelSelectScene');
    });

    const hasPlayedToday = hasDailyChallengeBeenAttemptedToday();
    this.createDailyChallengeButton(rightCol, startY, buttonWidth, buttonHeight, hasPlayedToday);

    // Row 2: Action modes
    this.createMenuButton(leftCol, startY + rowSpacing, buttonWidth, buttonHeight, 'CASCADE', COLORS.accentTertiary, () => {
      this.scene.start('CascadeScene');
    });

    this.createMenuButton(rightCol, startY + rowSpacing, buttonWidth, buttonHeight, 'TIME ATTACK', COLORS.error, () => {
      this.scene.start('TimeAttackScene');
    });

    // Row 3: Relaxed modes
    this.createMenuButton(leftCol, startY + rowSpacing * 2, buttonWidth, buttonHeight, 'ZEN MODE', COLORS.accent, () => {
      this.scene.start('ZenModeScene');
    });

    this.createMenuButton(rightCol, startY + rowSpacing * 2, buttonWidth, buttonHeight, 'VERSUS', COLORS.symbols.shapes, () => {
      this.scene.start('VersusScene');
    });

    // Divider line
    const divider = this.add.graphics();
    divider.lineStyle(1, COLORS.secondary, 0.5);
    divider.lineBetween(GAME_WIDTH / 2 - 200, startY + rowSpacing * 3 - 8, GAME_WIDTH / 2 + 200, startY + rowSpacing * 3 - 8);

    // Row 4: Utility buttons (smaller, more subtle)
    const utilY = startY + rowSpacing * 3 + 12;
    const utilWidth = 180;
    const utilHeight = 38;
    const utilSpacing = 200;

    this.createUtilityButton(GAME_WIDTH / 2 - utilSpacing / 2, utilY, utilWidth, utilHeight, 'HOW TO PLAY', () => {
      this.scene.start('TutorialScene');
    });

    this.createUtilityButton(GAME_WIDTH / 2 + utilSpacing / 2, utilY, utilWidth, utilHeight, 'SETTINGS', () => {
      this.scene.start('SettingsScene');
    });

    // Credits
    const credits = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 35,
      'Made with Phaser 3  •  Assets by Kenney.nl',
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#484f58',
      }
    );
    credits.setOrigin(0.5, 0.5);
  }

  private createStatsRow(gameState: ReturnType<typeof loadGameState>, y: number): void {
    const completedLevels = gameState.levelsCompleted.length;
    const totalLevels = getTotalLevels();
    const progressPercent = completedLevels / totalLevels;

    // Container for stats
    const statsContainer = this.add.container(GAME_WIDTH / 2, y);

    // Progress section (left)
    const progressWidth = 140;
    const progressHeight = 8;
    const progressX = -120;

    // Progress bar background
    const progressBg = this.add.graphics();
    progressBg.fillStyle(COLORS.primary, 1);
    progressBg.fillRoundedRect(progressX - progressWidth / 2, -progressHeight / 2, progressWidth, progressHeight, 4);
    statsContainer.add(progressBg);

    // Progress bar fill
    if (progressPercent > 0) {
      const progressFill = this.add.graphics();
      progressFill.fillStyle(COLORS.success, 1);
      progressFill.fillRoundedRect(progressX - progressWidth / 2, -progressHeight / 2, progressWidth * progressPercent, progressHeight, 4);
      statsContainer.add(progressFill);
    }

    // Progress label
    const progressLabel = this.add.text(
      progressX,
      14,
      `${completedLevels}/${totalLevels} levels`,
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#8b949e',
      }
    );
    progressLabel.setOrigin(0.5, 0.5);
    statsContainer.add(progressLabel);

    // Divider
    const dividerLine = this.add.graphics();
    dividerLine.lineStyle(1, COLORS.secondary, 0.5);
    dividerLine.lineBetween(0, -12, 0, 12);
    statsContainer.add(dividerLine);

    // Score section (right)
    const scoreX = 100;

    if (this.textures.exists('coin_gold')) {
      const coinIcon = this.add.image(scoreX - 50, 0, 'coin_gold');
      coinIcon.setScale(0.3);
      statsContainer.add(coinIcon);
    }

    const scoreText = this.add.text(
      scoreX,
      0,
      `${gameState.totalScore.toLocaleString()}`,
      {
        fontFamily: 'Arial Black, Arial',
        fontSize: '18px',
        color: '#ffc83d',
      }
    );
    scoreText.setOrigin(0.5, 0.5);
    statsContainer.add(scoreText);

    const scoreLabel = this.add.text(
      scoreX,
      16,
      'total score',
      {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#8b949e',
      }
    );
    scoreLabel.setOrigin(0.5, 0.5);
    statsContainer.add(scoreLabel);
  }

  private createMenuButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    accentColor: number,
    callback: () => void
  ): void {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, accentColor, 0.4);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    // Subtle left accent bar
    const accentBar = this.add.graphics();
    accentBar.fillStyle(accentColor, 0.8);
    accentBar.fillRoundedRect(-width / 2, -height / 2 + 4, 3, height - 8, 2);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#f0f6fc',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, accentBar, label]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, accentColor, 0.8);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

      accentBar.clear();
      accentBar.fillStyle(accentColor, 1);
      accentBar.fillRoundedRect(-width / 2, -height / 2 + 4, 4, height - 8, 2);

      this.tweens.add({
        targets: button,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 100,
        ease: 'Back.easeOut',
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, accentColor, 0.4);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

      accentBar.clear();
      accentBar.fillStyle(accentColor, 0.8);
      accentBar.fillRoundedRect(-width / 2, -height / 2 + 4, 3, height - 8, 2);

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

  private createDailyChallengeButton(
    x: number,
    y: number,
    width: number,
    height: number,
    hasPlayedToday: boolean
  ): void {
    const button = this.add.container(x, y);
    const accentColor = COLORS.ui.badge.gold;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, accentColor, 0.5);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    // Gold accent bar
    const accentBar = this.add.graphics();
    accentBar.fillStyle(accentColor, 0.8);
    accentBar.fillRoundedRect(-width / 2, -height / 2 + 4, 3, height - 8, 2);

    // Star icon
    const starIcon = this.add.text(-width / 2 + 24, 0, '★', {
      fontSize: '16px',
      color: '#ffc83d',
    });
    starIcon.setOrigin(0.5, 0.5);

    const label = this.add.text(8, 0, 'DAILY', {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: 'bold',
      color: hasPlayedToday ? '#8b949e' : '#ffc83d',
    });
    label.setOrigin(0.5, 0.5);

    // Status badge
    let statusBadge: Phaser.GameObjects.Container;
    if (hasPlayedToday) {
      const checkmark = this.add.text(width / 2 - 24, 0, '✓', {
        fontSize: '14px',
        color: '#3fb950',
      });
      checkmark.setOrigin(0.5, 0.5);
      statusBadge = this.add.container(0, 0, [checkmark]);
    } else {
      const newBadge = this.add.graphics();
      newBadge.fillStyle(COLORS.error, 1);
      newBadge.fillRoundedRect(width / 2 - 42, -10, 32, 20, 4);

      const newText = this.add.text(width / 2 - 26, 0, 'NEW', {
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      newText.setOrigin(0.5, 0.5);

      statusBadge = this.add.container(0, 0, [newBadge, newText]);

      // Subtle pulse
      this.tweens.add({
        targets: statusBadge,
        alpha: 0.7,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    button.add([bg, accentBar, starIcon, label, statusBadge]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, accentColor, 0.9);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

      accentBar.clear();
      accentBar.fillStyle(accentColor, 1);
      accentBar.fillRoundedRect(-width / 2, -height / 2 + 4, 4, height - 8, 2);

      label.setColor('#ffc83d');
      this.tweens.add({
        targets: button,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 100,
        ease: 'Back.easeOut',
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 1);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      bg.lineStyle(2, accentColor, 0.5);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

      accentBar.clear();
      accentBar.fillStyle(accentColor, 0.8);
      accentBar.fillRoundedRect(-width / 2, -height / 2 + 4, 3, height - 8, 2);

      label.setColor(hasPlayedToday ? '#8b949e' : '#ffc83d');
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    button.on('pointerdown', () => {
      audio.playClick();
      this.scene.start('DailyChallengeScene');
    });
  }

  private createUtilityButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    callback: () => void
  ): void {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 0.6);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.lineStyle(1, COLORS.secondary, 0.6);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8b949e',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(width, height);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 0.8);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
      bg.lineStyle(1, COLORS.tertiary, 0.8);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      label.setColor('#f0f6fc');

      this.tweens.add({
        targets: button,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 80,
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 0.6);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
      bg.lineStyle(1, COLORS.secondary, 0.6);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      label.setColor('#8b949e');

      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 80,
      });
    });

    button.on('pointerdown', () => {
      audio.playClick();
      callback();
    });
  }

  private createBackgroundAnimation(): void {
    // Create floating tile sprites in background - fewer, more subtle
    for (let i = 0; i < 12; i++) {
      const tileKey = BACKGROUND_TILES[Math.floor(Math.random() * BACKGROUND_TILES.length)];

      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const scale = 0.2 + Math.random() * 0.3;
      const startAlpha = 0.06 + Math.random() * 0.08;

      if (tileKey !== undefined && this.textures.exists(tileKey)) {
        const tile = this.add.image(x, y, tileKey);
        tile.setScale(scale);
        tile.setAlpha(startAlpha);
        tile.setAngle(Math.random() * 360);
        tile.setTint(0x58a6ff); // Tint to match accent color

        // Slower, more gentle floating
        this.tweens.add({
          targets: tile,
          y: y - 20 + Math.random() * 40,
          x: x - 20 + Math.random() * 40,
          alpha: startAlpha * 0.6 + Math.random() * startAlpha * 0.4,
          angle: tile.angle + (Math.random() - 0.5) * 20,
          duration: 6000 + Math.random() * 4000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Math.random() * 3000,
        });
      } else {
        // Fallback to text symbols
        const symbols = ['◆', '○', '□', '△'];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        if (symbol === undefined) continue;

        const text = this.add.text(x, y, symbol, {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#21262d',
        });
        text.setOrigin(0.5, 0.5);
        text.setAlpha(0.15);

        this.tweens.add({
          targets: text,
          y: y - 15 + Math.random() * 30,
          x: x - 15 + Math.random() * 30,
          alpha: 0.08 + Math.random() * 0.12,
          duration: 5000 + Math.random() * 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }
}
