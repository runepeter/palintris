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

    // Background bar - more refined with subtle gradient effect
    const bg = scene.add.graphics();
    bg.fillStyle(COLORS.primary, 0.95);
    bg.fillRoundedRect(-GAME_WIDTH / 2 + 20, -24, GAME_WIDTH - 40, 48, 8);
    bg.lineStyle(1, COLORS.secondary, 0.5);
    bg.strokeRoundedRect(-GAME_WIDTH / 2 + 20, -24, GAME_WIDTH - 40, 48, 8);
    this.add(bg);

    // Level name - left aligned with accent
    const levelContainer = scene.add.container(-GAME_WIDTH / 2 + 40, 0);

    const levelLabel = scene.add.text(0, -8, 'LEVEL ' + levelConfig.id, {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#8b949e',
    });
    levelLabel.setOrigin(0, 0.5);
    levelContainer.add(levelLabel);

    this.levelText = scene.add.text(0, 8, levelConfig.name, {
      fontFamily: 'Arial',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#f0f6fc',
    });
    this.levelText.setOrigin(0, 0.5);
    levelContainer.add(this.levelText);

    this.add(levelContainer);

    // Operations remaining - center with icon-style display
    const opsContainer = scene.add.container(0, 0);

    const opsIcon = scene.add.text(-35, 0, '◆', {
      fontSize: '12px',
      color: '#8b949e',
    });
    opsIcon.setOrigin(0.5, 0.5);
    opsContainer.add(opsIcon);

    this.operationsText = scene.add.text(0, 0, `${levelConfig.maxOperations}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#3fb950',
    });
    this.operationsText.setOrigin(0.5, 0.5);
    opsContainer.add(this.operationsText);

    const opsLabel = scene.add.text(0, 16, 'moves', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#8b949e',
    });
    opsLabel.setOrigin(0.5, 0.5);
    opsContainer.add(opsLabel);

    this.add(opsContainer);

    // Timer (if applicable) - right side with clear visual state
    if (levelConfig.timeLimit !== null) {
      const timerContainer = scene.add.container(GAME_WIDTH / 2 - 150, 0);

      // Timer glow background
      this.timerGlow = scene.add.graphics();
      timerContainer.add(this.timerGlow);

      const timerIcon = scene.add.text(-30, 0, '⏱', {
        fontSize: '14px',
      });
      timerIcon.setOrigin(0.5, 0.5);
      timerContainer.add(timerIcon);

      this.timerText = scene.add.text(10, 0, this.formatTime(levelConfig.timeLimit), {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#3fb950',
      });
      this.timerText.setOrigin(0.5, 0.5);
      timerContainer.add(this.timerText);

      this.add(timerContainer);
    }

    // Score - far right
    const scoreContainer = scene.add.container(GAME_WIDTH / 2 - 60, 0);

    const scoreLabel = scene.add.text(0, -8, 'SCORE', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#8b949e',
    });
    scoreLabel.setOrigin(1, 0.5);
    scoreContainer.add(scoreLabel);

    this.scoreText = scene.add.text(0, 8, '0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#ffc83d',
    });
    this.scoreText.setOrigin(1, 0.5);
    scoreContainer.add(this.scoreText);

    this.add(scoreContainer);

    scene.add.existing(this);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  public updateOperations(remaining: number): void {
    this.operationsText.setText(`${remaining}`);

    if (remaining <= 2) {
      this.operationsText.setColor('#f85149');
    } else if (remaining <= 4) {
      this.operationsText.setColor('#d29922');
    } else {
      this.operationsText.setColor('#3fb950');
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
      this.timerText.setColor('#f85149');
      this.timerText.setFontStyle('bold');

      // Draw pulsing red glow
      if (this.timerGlow) {
        this.timerGlow.clear();
        this.timerGlow.fillStyle(0xf85149, 0.2);
        this.timerGlow.fillCircle(10, 0, 30);
      }

      // Continuous pulse
      this.pulseTween = this.scene.tweens.add({
        targets: this.timerText,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Shake effect
      const originalX = this.timerText.x;
      this.shakeTween = this.scene.tweens.add({
        targets: this.timerText,
        x: originalX - 2,
        duration: 50,
        yoyo: true,
        repeat: -1,
      });

      // Pulse the glow
      if (this.timerGlow) {
        this.scene.tweens.add({
          targets: this.timerGlow,
          alpha: 0.5,
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
      }

    } else if (seconds <= 10) {
      // WARNING: Orange-red pulse (no shake yet)
      this.timerText.setColor('#ff7b72');
      this.timerText.setFontStyle('bold');

      // Draw orange glow
      if (this.timerGlow) {
        this.timerGlow.clear();
        this.timerGlow.fillStyle(0xffa657, 0.15);
        this.timerGlow.fillCircle(10, 0, 25);

        this.scene.tweens.add({
          targets: this.timerGlow,
          alpha: 0.4,
          duration: 500,
          yoyo: true,
          repeat: -1,
        });
      }

      // Gentle pulse
      this.pulseTween = this.scene.tweens.add({
        targets: this.timerText,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

    } else if (seconds <= 30) {
      // CAUTION: Amber
      this.timerText.setColor('#d29922');

      // Clear glow
      if (this.timerGlow) {
        this.timerGlow.clear();
      }

    } else {
      // SAFE: Green
      this.timerText.setColor('#3fb950');

      // Clear glow
      if (this.timerGlow) {
        this.timerGlow.clear();
      }
    }
  }

  public updateScore(score: number): void {
    this.scoreText.setText(score.toLocaleString());
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
    this.timerText.setColor('#f85149');
    this.scene.tweens.add({
      targets: this.timerText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });
  }

  public flashTimeBonus(bonusSeconds: number): void {
    if (this.timerText === null || this.timerGlow === null) return;

    // Flash green for time bonus
    this.timerGlow.clear();
    this.timerGlow.fillStyle(0x3fb950, 0.4);
    this.timerGlow.fillCircle(10, 0, 35);

    // Bonus text
    const bonusText = this.scene.add.text(
      10,
      -25,
      `+${bonusSeconds}s`,
      {
        fontFamily: 'Arial Black',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#3fb950',
        stroke: '#0d1117',
        strokeThickness: 3,
      }
    );
    bonusText.setOrigin(0.5, 0.5);
    this.add(bonusText);

    // Animate bonus text
    this.scene.tweens.add({
      targets: bonusText,
      y: -50,
      alpha: 0,
      scale: 1.3,
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
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }
}
