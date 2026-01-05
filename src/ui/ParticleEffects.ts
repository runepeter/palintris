import Phaser from 'phaser';
import { RAINBOW_COLORS } from '../config/theme';

// Particle sprite keys
const WHITE_PARTICLES = ['particle_white_1', 'particle_white_2', 'particle_white_3', 'particle_white_4', 'particle_white_5', 'particle_white_6', 'particle_white_7'];
const BLUE_PARTICLES = ['particle_blue_1', 'particle_blue_2', 'particle_blue_3', 'particle_blue_4', 'particle_blue_5', 'particle_blue_6', 'particle_blue_7'];
const YELLOW_PARTICLES = ['particle_yellow_1', 'particle_yellow_2', 'particle_yellow_3', 'particle_yellow_4', 'particle_yellow_5', 'particle_yellow_6', 'particle_yellow_7'];

export class ParticleEffects {
  private scene: Phaser.Scene;
  private useSprites: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Check if particle sprites are loaded
    this.useSprites = scene.textures.exists('particle_white_1');
  }

  private getRandomParticle(type: 'white' | 'blue' | 'yellow'): string {
    const particles = type === 'white' ? WHITE_PARTICLES : type === 'blue' ? BLUE_PARTICLES : YELLOW_PARTICLES;
    return particles[Math.floor(Math.random() * particles.length)] ?? 'particle_white_1';
  }

  private createSpriteParticle(x: number, y: number, type: 'white' | 'blue' | 'yellow', scale: number = 0.5): Phaser.GameObjects.Image | Phaser.GameObjects.Arc {
    if (this.useSprites) {
      const sprite = this.scene.add.image(x, y, this.getRandomParticle(type));
      sprite.setScale(scale);
      return sprite;
    } else {
      const color = type === 'white' ? 0xffffff : type === 'blue' ? 0x4488ff : 0xffdd44;
      return this.scene.add.circle(x, y, 4 * scale * 2, color);
    }
  }

  // Celebration particles for level completion - now with sprites!
  public celebrationBurst(x: number, y: number): void {
    const types: Array<'white' | 'blue' | 'yellow'> = ['white', 'blue', 'yellow'];

    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + Math.random() * 0.3;
      const speed = 200 + Math.random() * 400;
      const type = types[Math.floor(Math.random() * types.length)] ?? 'white';
      const scale = 0.3 + Math.random() * 0.4;

      const particle = this.createSpriteParticle(x, y, type, scale);
      particle.setAlpha(1);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed - 150,
        alpha: 0,
        scale: 0,
        angle: Math.random() * 720 - 360,
        duration: 800 + Math.random() * 600,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Sparkle effect around a point - enhanced with sprites
  public sparkle(x: number, y: number, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 80;
      const scale = 0.2 + Math.random() * 0.3;

      const particle = this.createSpriteParticle(x + offsetX, y + offsetY, 'yellow', scale);
      particle.setAlpha(0);

      this.scene.tweens.add({
        targets: particle,
        alpha: 1,
        scale: scale * 1.5,
        duration: 200,
        yoyo: true,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Trail effect when tiles move - with sprite particles
  public trail(fromX: number, fromY: number, toX: number, toY: number, color: number): void {
    const steps = 10;
    const type = color > 0x888888 ? 'yellow' : 'blue';

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = fromX + (toX - fromX) * t;
      const y = fromY + (toY - fromY) * t;

      const particle = this.createSpriteParticle(x, y, type, 0.15 + (1 - t) * 0.1);
      particle.setAlpha(0.8 - t * 0.6);

      this.scene.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0,
        duration: 400,
        delay: i * 25,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Palindrome found rainbow effect - enhanced
  public palindromeRainbow(tiles: Array<{ x: number; y: number }>): void {
    tiles.forEach((tile, index) => {
      const delay = index * 60;
      const color = RAINBOW_COLORS[index % RAINBOW_COLORS.length] ?? 0xffffff;

      // Ring effect
      const ring = this.scene.add.circle(tile.x, tile.y, 35, color, 0);
      ring.setStrokeStyle(5, color);
      ring.setAlpha(0);

      this.scene.tweens.add({
        targets: ring,
        alpha: 1,
        scale: 1.8,
        duration: 350,
        delay,
        yoyo: true,
        ease: 'Sine.easeOut',
        onComplete: () => ring.destroy(),
      });

      // Sprite burst at each tile
      this.scene.time.delayedCall(delay, () => {
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const particle = this.createSpriteParticle(tile.x, tile.y, 'yellow', 0.25);

          this.scene.tweens.add({
            targets: particle,
            x: tile.x + Math.cos(angle) * 50,
            y: tile.y + Math.sin(angle) * 50,
            alpha: 0,
            scale: 0,
            duration: 400,
            ease: 'Power2',
            onComplete: () => particle.destroy(),
          });
        }
      });
    });
  }

  // Failure effect - red particles
  public failureEffect(x: number, y: number): void {
    for (let i = 0; i < 25; i++) {
      const offsetX = (Math.random() - 0.5) * 120;
      const offsetY = (Math.random() - 0.5) * 120;

      const particle = this.scene.add.circle(x + offsetX, y + offsetY, 4, 0xff4444);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y + 60,
        alpha: 0,
        scale: 0,
        duration: 600 + Math.random() * 400,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Swap effect - two trails that cross with enhanced particles
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

    // Enhanced crossing sparkle
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    this.scene.time.delayedCall(150, () => {
      // Big sparkle burst in the middle
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const particle = this.createSpriteParticle(midX, midY, 'white', 0.2);

        this.scene.tweens.add({
          targets: particle,
          x: midX + Math.cos(angle) * 30,
          y: midY + Math.sin(angle) * 30,
          alpha: 0,
          rotation: Math.PI,
          duration: 300,
          ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      }
    });
  }

  // Glow pulse effect
  public glowPulse(x: number, y: number, color: number, size: number): Phaser.GameObjects.Arc {
    const glow = this.scene.add.circle(x, y, size, color, 0.3);

    this.scene.tweens.add({
      targets: glow,
      scale: 1.4,
      alpha: 0,
      duration: 600,
      repeat: -1,
    });

    return glow;
  }

  // Confetti rain for big wins - enhanced with sprites
  public confettiRain(duration: number = 3000): void {
    const types: Array<'white' | 'blue' | 'yellow'> = ['white', 'blue', 'yellow'];
    const startTime = Date.now();

    const spawnConfetti = (): void => {
      if (Date.now() - startTime > duration) return;

      const x = Math.random() * 800;
      const type = types[Math.floor(Math.random() * types.length)] ?? 'white';

      if (this.useSprites) {
        const confetti = this.scene.add.image(x, -30, this.getRandomParticle(type));
        confetti.setScale(0.3 + Math.random() * 0.3);
        confetti.setAngle(Math.random() * 360);

        this.scene.tweens.add({
          targets: confetti,
          y: 650,
          x: x + (Math.random() - 0.5) * 250,
          angle: confetti.angle + (Math.random() - 0.5) * 1080,
          duration: 2500 + Math.random() * 1500,
          onComplete: () => confetti.destroy(),
        });
      } else {
        const color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)] ?? 0xffffff;
        const confetti = this.scene.add.rectangle(x, -20, 6, 12, color);
        confetti.setAngle(Math.random() * 360);

        this.scene.tweens.add({
          targets: confetti,
          y: 650,
          x: x + (Math.random() - 0.5) * 250,
          angle: confetti.angle + (Math.random() - 0.5) * 1080,
          duration: 2500 + Math.random() * 1500,
          onComplete: () => confetti.destroy(),
        });
      }

      this.scene.time.delayedCall(25 + Math.random() * 40, spawnConfetti);
    };

    spawnConfetti();
  }

  // Power-up collect effect - enhanced
  public collectEffect(x: number, y: number, color: number): void {
    // Expanding ring
    const ring = this.scene.add.circle(x, y, 15, color, 0);
    ring.setStrokeStyle(4, color);

    this.scene.tweens.add({
      targets: ring,
      scale: 4,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Sprite burst
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const particle = this.createSpriteParticle(x, y, 'yellow', 0.25);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 60,
        y: y + Math.sin(angle) * 60,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  // Time warning pulse
  public timeWarningPulse(x: number, y: number): void {
    const pulse = this.scene.add.circle(x, y, 60, 0xff0000, 0.4);

    this.scene.tweens.add({
      targets: pulse,
      scale: 2.5,
      alpha: 0,
      duration: 600,
      repeat: 3,
      onComplete: () => pulse.destroy(),
    });
  }

  // Tile hover glow
  public createHoverGlow(x: number, y: number, color: number): Phaser.GameObjects.Graphics {
    const glow = this.scene.add.graphics();
    glow.fillStyle(color, 0.25);
    glow.fillRoundedRect(x - 38, y - 38, 76, 76, 12);
    return glow;
  }

  // Badge unlock effect - enhanced with sprites
  public badgeUnlock(x: number, y: number): void {
    // Golden burst with sprites
    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40;
      const speed = 80 + Math.random() * 180;

      const particle = this.createSpriteParticle(x, y, 'yellow', 0.3 + Math.random() * 0.2);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        alpha: 0,
        angle: Math.random() * 720,
        scale: 0,
        duration: 700,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Flash
    const flash = this.scene.add.circle(x, y, 120, 0xffd700, 0.6);
    this.scene.tweens.add({
      targets: flash,
      scale: 2.5,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });
  }

  // Continuous background particles - enhanced
  public createBackgroundParticles(): void {
    const spawnParticle = (): void => {
      const x = Math.random() * 800;
      const y = 620;

      if (this.useSprites && Math.random() > 0.5) {
        const particle = this.scene.add.image(x, y, this.getRandomParticle('blue'));
        particle.setScale(0.1 + Math.random() * 0.15);
        particle.setAlpha(0.2);

        this.scene.tweens.add({
          targets: particle,
          y: -30,
          x: x + (Math.random() - 0.5) * 120,
          alpha: 0,
          angle: Math.random() * 360,
          duration: 5000 + Math.random() * 3000,
          onComplete: () => particle.destroy(),
        });
      } else {
        const colors = [0x3a2a6a, 0x2a5a9a, 0x6a2a9a];
        const color = colors[Math.floor(Math.random() * colors.length)] ?? 0x3a2a6a;

        const particle = this.scene.add.circle(x, y, 2 + Math.random() * 4, color, 0.25);

        this.scene.tweens.add({
          targets: particle,
          y: -30,
          x: x + (Math.random() - 0.5) * 120,
          alpha: 0,
          duration: 5000 + Math.random() * 3000,
          onComplete: () => particle.destroy(),
        });
      }
    };

    // Use Phaser's timer instead of setInterval for proper cleanup
    this.scene.time.addEvent({
      delay: 180,
      callback: spawnParticle,
      loop: true,
    });
  }

  // New: Coin collect effect
  public coinCollect(x: number, y: number): void {
    // Spawn coin image if available
    if (this.scene.textures.exists('coin_gold')) {
      const coin = this.scene.add.image(x, y, 'coin_gold');
      coin.setScale(0.5);

      this.scene.tweens.add({
        targets: coin,
        y: y - 80,
        alpha: 0,
        scale: 0.8,
        duration: 600,
        ease: 'Power2',
        onComplete: () => coin.destroy(),
      });
    }

    // Sparkles around
    this.sparkle(x, y, 8);
  }

  // New: Level complete starburst
  public levelCompleteStarburst(x: number, y: number): void {
    // Multiple waves of particles
    for (let wave = 0; wave < 3; wave++) {
      this.scene.time.delayedCall(wave * 200, () => {
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20 + wave * 0.2;
          const speed = 150 + wave * 100;
          const type: 'white' | 'blue' | 'yellow' = wave === 0 ? 'yellow' : wave === 1 ? 'white' : 'blue';

          const particle = this.createSpriteParticle(x, y, type, 0.3);

          this.scene.tweens.add({
            targets: particle,
            x: x + Math.cos(angle) * speed,
            y: y + Math.sin(angle) * speed - 50,
            alpha: 0,
            scale: 0,
            angle: Math.random() * 360,
            duration: 800,
            ease: 'Power2',
            onComplete: () => particle.destroy(),
          });
        }
      });
    }
  }
}
