import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config/gameConfig';
import type { LevelConfig } from '../types';

export class HUD extends Phaser.GameObjects.Container {
  private levelText: Phaser.GameObjects.Text;
  private operationsText: Phaser.GameObjects.Text;
  private timerText: Phaser.GameObjects.Text | null = null;
  private timerGlow: Phaser.GameObjects.Graphics | null = null;
  private scoreText: Phaser.GameObjects.Text;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private shakeTween: Phaser.Tweens.Tween | null = null;

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
      // Timer glow background
      this.timerGlow = scene.add.graphics();
      this.add(this.timerGlow);

      this.timerText = scene.add.text(
        GAME_WIDTH / 2 - 140,
        0,
        this.formatTime(levelConfig.timeLimit),
        {
          fontFamily: 'Arial',
          fontSize: '16px',
          fontStyle: 'bold',
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

    // Stop existing animations
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween = null;
    }
    if (this.shakeTween) {
      this.shakeTween.stop();
      this.shakeTween = null;
    }

    // Reset scale
    this.timerText.setScale(1);

    if (seconds <= 5) {
      // CRITICAL: Red pulsing + shake
      this.timerText.setColor('#ff0000');
      this.timerText.setFontStyle('bold');

      // Draw pulsing red glow
      if (this.timerGlow) {
        this.timerGlow.clear();
        this.timerGlow.fillStyle(0xff0000, 0.3);
        this.timerGlow.fillCircle(GAME_WIDTH / 2 - 140, 0, 35);
      }

      // Continuous pulse
      this.pulseTween = this.scene.tweens.add({
        targets: this.timerText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Shake effect
      const originalX = this.timerText.x;
      this.shakeTween = this.scene.tweens.add({
        targets: this.timerText,
        x: originalX - 3,
        duration: 50,
        yoyo: true,
        repeat: -1,
      });

      // Pulse the glow
      if (this.timerGlow) {
        this.scene.tweens.add({
          targets: this.timerGlow,
          alpha: 0.6,
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
      }

    } else if (seconds <= 10) {
      // WARNING: Red pulse (no shake yet)
      this.timerText.setColor('#ff3366');
      this.timerText.setFontStyle('bold');

      // Draw orange glow
      if (this.timerGlow) {
        this.timerGlow.clear();
        this.timerGlow.fillStyle(0xff6600, 0.25);
        this.timerGlow.fillCircle(GAME_WIDTH / 2 - 140, 0, 30);

        this.scene.tweens.add({
          targets: this.timerGlow,
          alpha: 0.5,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }

      // Gentle pulse
      this.pulseTween = this.scene.tweens.add({
        targets: this.timerText,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

    } else if (seconds <= 30) {
      // CAUTION: Yellow
      this.timerText.setColor('#ffaa00');

      // Clear glow
      if (this.timerGlow) {
        this.timerGlow.clear();
      }

    } else {
      // SAFE: Green
      this.timerText.setColor('#00ff88');

      // Clear glow
      if (this.timerGlow) {
        this.timerGlow.clear();
      }
    }
  }

  public updateScore(score: number): void {
    this.scoreText.setText(`Score: ${score.toLocaleString()}`);
  }

  public showTimeUp(): void {
    if (this.timerText === null) return;

    // Stop all timer animations
    if (this.pulseTween) {
      this.pulseTween.stop();
    }
    if (this.shakeTween) {
      this.shakeTween.stop();
    }

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

  public flashTimeBonus(bonusSeconds: number): void {
    if (this.timerText === null || this.timerGlow === null) return;

    // Flash green for time bonus
    this.timerGlow.clear();
    this.timerGlow.fillStyle(0x00ff88, 0.6);
    this.timerGlow.fillCircle(GAME_WIDTH / 2 - 140, 0, 40);

    // Bonus text
    const bonusText = this.scene.add.text(
      GAME_WIDTH / 2 - 140,
      -30,
      `+${bonusSeconds}s`,
      {
        fontFamily: 'Arial Black',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#00ff88',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    bonusText.setOrigin(0.5, 0.5);
    this.add(bonusText);

    // Animate bonus text
    this.scene.tweens.add({
      targets: bonusText,
      y: -60,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Back.easeOut',
      onComplete: () => bonusText.destroy(),
    });

    // Flash and fade glow
    this.scene.tweens.add({
      targets: this.timerGlow,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
    });

    // Pulse timer text
    this.scene.tweens.add({
      targets: this.timerText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }
}
