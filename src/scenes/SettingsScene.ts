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

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 50, 'Settings', {
      fontFamily: 'Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
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

  private createToggle(
    key: keyof GameSettings,
    label: string,
    y: number
  ): void {
    const container = this.add.container(GAME_WIDTH / 2, y);

    // Label
    const labelText = this.add.text(-150, 0, label, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
    });
    labelText.setOrigin(0, 0.5);

    // Toggle background
    const toggleBg = this.add.graphics();
    this.drawToggle(toggleBg, this.settings[key]);

    // Toggle knob
    const knob = this.add.graphics();
    knob.fillStyle(0xffffff, 1);
    knob.fillCircle(this.settings[key] ? 20 : -20, 0, 14);

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
    graphics.fillStyle(enabled ? COLORS.success : 0x555555, 1);
    graphics.fillRoundedRect(-30, -15, 60, 30, 15);
  }

  private createResetButton(y: number): void {
    const container = this.add.container(GAME_WIDTH / 2, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x882222, 1);
    bg.fillRoundedRect(-120, -25, 240, 50, 10);

    const label = this.add.text(0, 0, 'Reset All Progress', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    container.add([bg, label]);
    container.setSize(240, 50);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xaa3333, 1);
      bg.fillRoundedRect(-120, -25, 240, 50, 10);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x882222, 1);
      bg.fillRoundedRect(-120, -25, 240, 50, 10);
    });

    container.on('pointerdown', () => {
      this.showConfirmDialog();
    });
  }

  private showConfirmDialog(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setInteractive();

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-180, -100, 360, 200, 20);
    bg.lineStyle(3, 0xff4444, 1);
    bg.strokeRoundedRect(-180, -100, 360, 200, 20);

    const title = this.add.text(0, -60, 'Reset Progress?', {
      fontFamily: 'Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ff4444',
    });
    title.setOrigin(0.5, 0.5);

    const message = this.add.text(0, -10, 'This will delete all your\nprogress and cannot be undone.', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#cccccc',
      align: 'center',
    });
    message.setOrigin(0.5, 0.5);

    modal.add([bg, title, message]);

    // Cancel button
    const cancelBtn = this.add.container(-80, 60);
    const cancelBg = this.add.graphics();
    cancelBg.fillStyle(COLORS.secondary, 1);
    cancelBg.fillRoundedRect(-60, -20, 120, 40, 8);

    const cancelLabel = this.add.text(0, 0, 'Cancel', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    cancelLabel.setOrigin(0.5, 0.5);

    cancelBtn.add([cancelBg, cancelLabel]);
    cancelBtn.setSize(120, 40);
    cancelBtn.setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerdown', () => {
      overlay.destroy();
      modal.destroy();
    });

    // Confirm button
    const confirmBtn = this.add.container(80, 60);
    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(0xaa2222, 1);
    confirmBg.fillRoundedRect(-60, -20, 120, 40, 8);

    const confirmLabel = this.add.text(0, 0, 'Reset', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    confirmLabel.setOrigin(0.5, 0.5);

    confirmBtn.add([confirmBg, confirmLabel]);
    confirmBtn.setSize(120, 40);
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
          fontSize: '24px',
          color: '#00ff88',
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
