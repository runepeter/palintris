import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';
import { loadSettings, saveSettings, resetProgress } from '../utils/storage';
import type { GameSettings } from '../types';

export class SettingsScene extends Phaser.Scene {
  private settings: GameSettings;
  private toggles: Map<keyof GameSettings, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super({ key: 'SettingsScene' });
    this.settings = loadSettings();
  }

  create(): void {
    this.settings = loadSettings();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d1117, 0x0d1117, 0x1a1f2e, 0x1a1f2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 50, 'Settings', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#f0f6fc',
    });
    title.setOrigin(0.5, 0.5);

    // Back button
    this.createBackButton();

    // Settings options
    const startY = 150;
    const spacing = 70;

    this.createToggle('soundEnabled', 'Sound Effects', startY);
    this.createToggle('musicEnabled', 'Music', startY + spacing);
    this.createToggle('particlesEnabled', 'Particles', startY + spacing * 2);
    this.createToggle('colorBlindMode', 'Color Blind Mode', startY + spacing * 3);

    // Reset progress button
    this.createResetButton(startY + spacing * 4 + 40);
  }

  private createBackButton(): void {
    const button = this.add.container(60, 50);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-40, -18, 80, 36, 6);
    bg.lineStyle(1, COLORS.secondary, 0.6);
    bg.strokeRoundedRect(-40, -18, 80, 36, 6);

    const label = this.add.text(0, 0, '← Back', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8b949e',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(80, 36);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.secondary, 1);
      bg.fillRoundedRect(-40, -18, 80, 36, 6);
      bg.lineStyle(1, COLORS.tertiary, 0.8);
      bg.strokeRoundedRect(-40, -18, 80, 36, 6);
      label.setColor('#f0f6fc');
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 1);
      bg.fillRoundedRect(-40, -18, 80, 36, 6);
      bg.lineStyle(1, COLORS.secondary, 0.6);
      bg.strokeRoundedRect(-40, -18, 80, 36, 6);
      label.setColor('#8b949e');
    });

    button.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private createToggle(
    key: keyof GameSettings,
    label: string,
    y: number
  ): void {
    const container = this.add.container(GAME_WIDTH / 2, y);

    // Label
    const labelText = this.add.text(-150, 0, label, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#f0f6fc',
    });
    labelText.setOrigin(0, 0.5);

    // Toggle background
    const toggleBg = this.add.graphics();
    this.drawToggle(toggleBg, this.settings[key]);

    // Toggle knob
    const knob = this.add.graphics();
    knob.fillStyle(0xf0f6fc, 1);
    knob.fillCircle(this.settings[key] ? 20 : -20, 0, 12);

    const toggleContainer = this.add.container(150, 0, [toggleBg, knob]);
    toggleContainer.setSize(60, 30);
    toggleContainer.setInteractive({ useHandCursor: true });

    toggleContainer.on('pointerdown', () => {
      this.settings[key] = !this.settings[key];
      saveSettings(this.settings);

      this.drawToggle(toggleBg, this.settings[key]);

      this.tweens.add({
        targets: knob,
        x: this.settings[key] ? 20 : -20,
        duration: 150,
        ease: 'Power2',
        onUpdate: () => {
          knob.clear();
          knob.fillStyle(0xffffff, 1);
          knob.fillCircle(0, 0, 14);
        },
      });
    });

    container.add([labelText, toggleContainer]);
    this.toggles.set(key, container);
  }

  private drawToggle(graphics: Phaser.GameObjects.Graphics, enabled: boolean): void {
    graphics.clear();
    graphics.fillStyle(enabled ? COLORS.success : COLORS.primary, 1);
    graphics.fillRoundedRect(-30, -14, 60, 28, 14);
    if (!enabled) {
      graphics.lineStyle(1, COLORS.secondary, 0.5);
      graphics.strokeRoundedRect(-30, -14, 60, 28, 14);
    }
  }

  private createResetButton(y: number): void {
    const container = this.add.container(GAME_WIDTH / 2, y);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-120, -22, 240, 44, 8);
    bg.lineStyle(2, COLORS.error, 0.5);
    bg.strokeRoundedRect(-120, -22, 240, 44, 8);

    const label = this.add.text(0, 0, 'Reset All Progress', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#f85149',
    });
    label.setOrigin(0.5, 0.5);

    container.add([bg, label]);
    container.setSize(240, 44);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x3d1a1a, 1);
      bg.fillRoundedRect(-120, -22, 240, 44, 8);
      bg.lineStyle(2, COLORS.error, 0.8);
      bg.strokeRoundedRect(-120, -22, 240, 44, 8);
      label.setColor('#ff7b72');
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.primary, 1);
      bg.fillRoundedRect(-120, -22, 240, 44, 8);
      bg.lineStyle(2, COLORS.error, 0.5);
      bg.strokeRoundedRect(-120, -22, 240, 44, 8);
      label.setColor('#f85149');
    });

    container.on('pointerdown', () => {
      this.showConfirmDialog();
    });
  }

  private showConfirmDialog(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x0d1117, 0.9);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive();

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.backgroundLight, 1);
    bg.fillRoundedRect(-180, -100, 360, 200, 12);
    bg.lineStyle(2, COLORS.error, 0.6);
    bg.strokeRoundedRect(-180, -100, 360, 200, 12);

    const title = this.add.text(0, -60, 'Reset Progress?', {
      fontFamily: 'Arial',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#f85149',
    });
    title.setOrigin(0.5, 0.5);

    const message = this.add.text(0, -10, 'This will delete all your\nprogress and cannot be undone.', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: '#8b949e',
      align: 'center',
    });
    message.setOrigin(0.5, 0.5);

    modal.add([bg, title, message]);

    // Cancel button
    const cancelBtn = this.add.container(-80, 60);
    const cancelBg = this.add.graphics();
    cancelBg.fillStyle(COLORS.primary, 1);
    cancelBg.fillRoundedRect(-55, -18, 110, 36, 6);
    cancelBg.lineStyle(1, COLORS.secondary, 0.6);
    cancelBg.strokeRoundedRect(-55, -18, 110, 36, 6);

    const cancelLabel = this.add.text(0, 0, 'Cancel', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#8b949e',
    });
    cancelLabel.setOrigin(0.5, 0.5);

    cancelBtn.add([cancelBg, cancelLabel]);
    cancelBtn.setSize(110, 36);
    cancelBtn.setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerdown', () => {
      overlay.destroy();
      modal.destroy();
    });

    // Confirm button
    const confirmBtn = this.add.container(80, 60);
    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(0x3d1a1a, 1);
    confirmBg.fillRoundedRect(-55, -18, 110, 36, 6);
    confirmBg.lineStyle(1, COLORS.error, 0.6);
    confirmBg.strokeRoundedRect(-55, -18, 110, 36, 6);

    const confirmLabel = this.add.text(0, 0, 'Reset', {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f85149',
    });
    confirmLabel.setOrigin(0.5, 0.5);

    confirmBtn.add([confirmBg, confirmLabel]);
    confirmBtn.setSize(110, 36);
    confirmBtn.setInteractive({ useHandCursor: true });

    confirmBtn.on('pointerdown', () => {
      resetProgress();
      overlay.destroy();
      modal.destroy();

      // Show confirmation
      const confirmText = this.add.text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        'Progress Reset!',
        {
          fontFamily: 'Arial',
          fontSize: '22px',
          color: '#3fb950',
        }
      );
      confirmText.setOrigin(0.5, 0.5);

      this.tweens.add({
        targets: confirmText,
        alpha: 0,
        y: GAME_HEIGHT / 2 - 50,
        duration: 1500,
        onComplete: () => confirmText.destroy(),
      });
    });

    modal.add([cancelBtn, confirmBtn]);
  }
}
