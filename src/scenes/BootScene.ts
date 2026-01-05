import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(COLORS.primary, 0.8);
    progressBox.fillRoundedRect(
      GAME_WIDTH / 2 - 160,
      GAME_HEIGHT / 2 - 25,
      320,
      50,
      10
    );

    const loadingText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      'Loading...',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
      }
    );
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      '0%',
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
      }
    );
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.accent, 1);
      progressBar.fillRoundedRect(
        GAME_WIDTH / 2 - 150,
        GAME_HEIGHT / 2 - 15,
        300 * value,
        30,
        5
      );
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load any assets here
    // For now we're using generated graphics
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
