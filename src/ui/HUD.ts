import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config/gameConfig';
import type { LevelConfig } from '../types';

export class HUD extends Phaser.GameObjects.Container {
  private levelText: Phaser.GameObjects.Text;
  private operationsText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text | null = null;
  private scoreText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, y: number, levelConfig: LevelConfig) {
    super(scene, GAME_WIDTH / 2, y);

    // Background bar
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.primary, 0.9);
    bg.fillRoundedRect(-GAME_WIDTH / 2 + 20, -25, GAME_WIDTH - 40, 50, 10);
    this.add(bg);

    // Level name
    this.levelText = scene.add.text(
      -GAME_WIDTH / 2 + 40,
      0,
      `Level ${levelConfig.id}: ${levelConfig.name}`,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffffff',
      }
    );
    this.levelText.setOrigin(0, 0.5);
    this.add(this.levelText);

    // Operations remaining
    this.operationsText = scene.add.text(
      0,
      0,
      `Moves: ${levelConfig.maxOperations}`,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffaa00',
      }
    );
    this.operationsText.setOrigin(0.5, 0.5);
    this.add(this.operationsText);

    // Timer (if applicable)
    if (levelConfig.timeLimit !== null) {
      this.timerText = scene.add.text(
        GAME_WIDTH / 2 - 140,
        0,
        this.formatTime(levelConfig.timeLimit),
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#00ff88',
        }
      );
      this.timerText.setOrigin(1, 0.5);
      this.add(this.timerText);
    }

    // Score
    this.scoreText = scene.add.text(
      GAME_WIDTH / 2 - 40,
      0,
      'Score: 0',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
      }
    );
    this.scoreText.setOrigin(1, 0.5);
    this.add(this.scoreText);

    scene.add.existing(this);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  public updateOperations(remaining: number): void {
    this.operationsText.setText(`Moves: ${remaining}`);

    if (remaining <= 2) {
      this.operationsText.setColor('#ff4444');
    } else if (remaining <= 4) {
      this.operationsText.setColor('#ffaa00');
    } else {
      this.operationsText.setColor('#00ff88');
    }
  }

  public updateTimer(seconds: number): void {
    if (this.timerText === null) return;

    this.timerText.setText(this.formatTime(seconds));

    if (seconds <= 10) {
      this.timerText.setColor('#ff4444');
      // Pulse effect
      if (seconds <= 5) {
        this.scene.tweens.add({
          targets: this.timerText,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          yoyo: true,
        });
      }
    } else if (seconds <= 30) {
      this.timerText.setColor('#ffaa00');
    } else {
      this.timerText.setColor('#00ff88');
    }
  }

  public updateScore(score: number): void {
    this.scoreText.setText(`Score: ${score.toLocaleString()}`);
  }

  public showTimeUp(): void {
    if (this.timerText === null) return;

    this.timerText.setText('TIME UP!');
    this.timerText.setColor('#ff0000');
    this.scene.tweens.add({
      targets: this.timerText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });
  }
}
