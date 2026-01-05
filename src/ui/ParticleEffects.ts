import Phaser from 'phaser';
import { DEFAULT_THEME, RAINBOW_COLORS } from '../config/theme';

export class ParticleEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // Celebration particles for level completion
  public celebrationBurst(x: number, y: number): void {
    const colors = DEFAULT_THEME.particles.successColors;

    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const speed = 200 + Math.random() * 300;
      const size = 4 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;

      const particle = this.scene.add.circle(x, y, size, color);
      particle.setAlpha(1);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 100,
        alpha: 0,
        scale: 0,
        duration: 800 + Math.random() * 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Sparkle effect around a point
  public sparkle(x: number, y: number, count: number = 10): void {
    const colors = DEFAULT_THEME.particles.sparkleColors;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;
      const size = 2 + Math.random() * 4;

      const star = this.scene.add.star(x + offsetX, y + offsetY, 4, size / 2, size, color);
      star.setAlpha(0);

      this.scene.tweens.add({
        targets: star,
        alpha: 1,
        scale: 1.5,
        duration: 200,
        yoyo: true,
        onComplete: () => star.destroy(),
      });
    }
  }

  // Trail effect when tiles move
  public trail(fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;

      const particle = this.scene.add.circle(x, y, 3, color);
      particle.setAlpha(0.6 - t * 0.5);

      this.scene.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0,
        duration: 300,
        delay: i * 30,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Palindrome found rainbow effect
  public palindromeRainbow(tiles: Array<{ x: number; y: number }>): void {
    tiles.forEach((tile, index) => {
      const delay = index * 50;
      const color = RAINBOW_COLORS[index % RAINBOW_COLORS.length] ?? 0xffffff;

      // Ring effect
      const ring = this.scene.add.circle(tile.x, tile.y, 30, color, 0);
      ring.setStrokeStyle(4, color);
      ring.setAlpha(0);

      this.scene.tweens.add({
        targets: ring,
        alpha: 1,
        scale: 1.5,
        duration: 300,
        delay,
        yoyo: true,
        onComplete: () => ring.destroy(),
      });

      // Star burst
      setTimeout(() => {
        this.sparkle(tile.x, tile.y, 5);
      }, delay);
    });
  }

  // Failure effect - red shake particles
  public failureEffect(x: number, y: number): void {
    const colors = DEFAULT_THEME.particles.failureColors;

    for (let i = 0; i < 20; i++) {
      const offsetX = (Math.random() - 0.5) * 100;
      const offsetY = (Math.random() - 0.5) * 100;
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xff0000;

      const particle = this.scene.add.circle(x + offsetX, y + offsetY, 3, color);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y + 50,
        alpha: 0,
        duration: 500 + Math.random() * 300,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Swap effect - two trails that cross
  public swapEffect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color1: number,
    color2: number
  ): void {
    this.trail(x1, y1, x2, y2, color1);
    this.trail(x2, y2, x1, y1, color2);

    // Crossing sparkle
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    setTimeout(() => {
      this.sparkle(midX, midY, 6);
    }, 150);
  }

  // Glow pulse effect
  public glowPulse(x: number, y: number, color: number, size: number): Phaser.GameObjects.Arc {
    const glow = this.scene.add.circle(x, y, size, color, 0.3);

    this.scene.tweens.add({
      targets: glow,
      scale: 1.3,
      alpha: 0,
      duration: 500,
      repeat: -1,
    });

    return glow;
  }

  // Confetti rain for big wins
  public confettiRain(duration: number = 3000): void {
    const colors = [...RAINBOW_COLORS];
    const startTime = Date.now();

    const spawnConfetti = (): void => {
      if (Date.now() - startTime > duration) return;

      const x = Math.random() * 800;
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;
      const size = 4 + Math.random() * 6;

      const confetti = this.scene.add.rectangle(x, -20, size, size * 2, color);
      confetti.setAngle(Math.random() * 360);

      this.scene.tweens.add({
        targets: confetti,
        y: 620,
        x: x + (Math.random() - 0.5) * 200,
        angle: confetti.angle + (Math.random() - 0.5) * 720,
        duration: 2000 + Math.random() * 1000,
        onComplete: () => confetti.destroy(),
      });

      this.scene.time.delayedCall(30 + Math.random() * 50, spawnConfetti);
    };

    spawnConfetti();
  }

  // Power-up collect effect
  public collectEffect(x: number, y: number, color: number): void {
    // Expanding ring
    const ring = this.scene.add.circle(x, y, 10, color, 0);
    ring.setStrokeStyle(3, color);

    this.scene.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => ring.destroy(),
    });

    // Floating +1 or icon
    this.sparkle(x, y, 12);
  }

  // Time warning pulse
  public timeWarningPulse(x: number, y: number): void {
    const pulse = this.scene.add.circle(x, y, 50, 0xff0000, 0.3);

    this.scene.tweens.add({
      targets: pulse,
      scale: 2,
      alpha: 0,
      duration: 500,
      repeat: 3,
      onComplete: () => pulse.destroy(),
    });
  }

  // Tile hover glow
  public createHoverGlow(x: number, y: number, color: number): Phaser.GameObjects.Graphics {
    const glow = this.scene.add.graphics();
    glow.fillStyle(color, 0.2);
    glow.fillRoundedRect(x - 35, y - 35, 70, 70, 10);
    return glow;
  }

  // Badge unlock effect
  public badgeUnlock(x: number, y: number): void {
    // Golden burst
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 100 + Math.random() * 150;

      const star = this.scene.add.star(x, y, 5, 2, 5, 0xffd700);

      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 600,
        onComplete: () => star.destroy(),
      });
    }

    // Flash
    const flash = this.scene.add.circle(x, y, 100, 0xffd700, 0.5);
    this.scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
  }

  // Continuous background particles
  public createBackgroundParticles(): void {
    const colors = [0x3a2a5a, 0x2a5a8a, 0x5a2a8a];

    setInterval(() => {
      const x = Math.random() * 800;
      const y = 600;
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0x3a2a5a;

      const particle = this.scene.add.circle(x, y, 2 + Math.random() * 3, color, 0.3);

      this.scene.tweens.add({
        targets: particle,
        y: -20,
        x: x + (Math.random() - 0.5) * 100,
        alpha: 0,
        duration: 4000 + Math.random() * 2000,
        onComplete: () => particle.destroy(),
      });
    }, 200);
  }
}
