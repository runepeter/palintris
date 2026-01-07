import Phaser from 'phaser';
import type { GearElement, RotationDirection } from '../types';

export class Gear extends Phaser.GameObjects.Container {
  private config: GearElement;
  private gearSprite: Phaser.GameObjects.Image;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private currentRotation = 0;
  private isRotating = false;
  private rotationSpeed = 90; // degrees per rotation action

  // Callbacks
  public onRotate?: (gear: Gear, direction: RotationDirection) => void;

  constructor(scene: Phaser.Scene, config: GearElement) {
    super(scene, config.gridX, config.gridY);
    this.config = config;

    // Create glow effect (behind gear)
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);

    // Create gear sprite
    const spriteKey = config.size === 'large' ? 'gear_large' : 'gear_narrow';
    this.gearSprite = scene.add.image(0, 0, spriteKey);
    this.gearSprite.setDisplaySize(
      config.size === 'large' ? 80 : 50,
      config.size === 'large' ? 80 : 50
    );
    this.add(this.gearSprite);

    // Make interactive if allowed
    if (config.interactive) {
      this.setSize(
        config.size === 'large' ? 80 : 50,
        config.size === 'large' ? 80 : 50
      );
      this.setInteractive({ useHandCursor: true });
      this.setupInteraction();
    }

    scene.add.existing(this);
  }

  private setupInteraction(): void {
    this.on('pointerover', () => {
      if (!this.isRotating) {
        this.showHoverEffect();
      }
    });

    this.on('pointerout', () => {
      this.hideHoverEffect();
    });

    this.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isRotating) {
        // Left click = clockwise, right click = counterclockwise
        const direction: RotationDirection = pointer.rightButtonDown()
          ? 'counterclockwise'
          : 'clockwise';
        this.rotate(direction);
      }
    });
  }

  private showHoverEffect(): void {
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(0x44aaff, 0.3);
    this.glowGraphics.fillCircle(0, 0, this.config.size === 'large' ? 50 : 35);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      ease: 'Back.easeOut',
    });
  }

  private hideHoverEffect(): void {
    this.glowGraphics.clear();
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
    });
  }

  public rotate(direction: RotationDirection): void {
    if (this.isRotating) return;

    this.isRotating = true;
    const targetRotation =
      direction === 'clockwise'
        ? this.currentRotation + this.rotationSpeed
        : this.currentRotation - this.rotationSpeed;

    // Animate gear rotation
    this.scene.tweens.add({
      targets: this.gearSprite,
      angle: targetRotation,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.currentRotation = targetRotation;
        this.isRotating = false;

        // Trigger callback
        if (this.onRotate !== undefined) {
          this.onRotate(this, direction);
        }
      },
    });

    // Add particle effect
    this.createRotationParticles(direction);

    // Play sound effect (if available)
    if (this.scene.sound.get('gear_click') !== null) {
      this.scene.sound.play('gear_click', { volume: 0.5 });
    }
  }

  private createRotationParticles(direction: RotationDirection): void {
    const particleCount = 8;
    const baseAngle = direction === 'clockwise' ? 0 : Math.PI;

    for (let i = 0; i < particleCount; i++) {
      const angle = baseAngle + (Math.PI * 2 * i) / particleCount;
      const startRadius = this.config.size === 'large' ? 30 : 20;
      const x = Math.cos(angle) * startRadius;
      const y = Math.sin(angle) * startRadius;

      // Check if sprite exists, otherwise use circle
      let particle: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (this.scene.textures.exists('particle_blue_1')) {
        particle = this.scene.add.image(this.x + x, this.y + y, 'particle_blue_1');
        particle.setScale(0.3);
      } else {
        particle = this.scene.add.circle(this.x + x, this.y + y, 4, 0x44aaff);
      }
      particle.setAlpha(0.8);

      const endX = Math.cos(angle + (direction === 'clockwise' ? 0.5 : -0.5)) * (startRadius + 40);
      const endY = Math.sin(angle + (direction === 'clockwise' ? 0.5 : -0.5)) * (startRadius + 40);

      this.scene.tweens.add({
        targets: particle,
        x: this.x + endX,
        y: this.y + endY,
        alpha: 0,
        scale: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  public getConfig(): GearElement {
    return this.config;
  }

  public getConnectedSymbolIndices(): number[] {
    return this.config.connectedSymbolIndices;
  }

  public setHighlight(enabled: boolean): void {
    if (enabled) {
      this.glowGraphics.clear();
      this.glowGraphics.fillStyle(0xffd700, 0.4);
      this.glowGraphics.fillCircle(0, 0, this.config.size === 'large' ? 55 : 40);

      this.scene.tweens.add({
        targets: this.glowGraphics,
        alpha: { from: 0.4, to: 0.8 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.killTweensOf(this.glowGraphics);
      this.glowGraphics.clear();
      this.glowGraphics.setAlpha(1);
    }
  }

  public pulseHint(): void {
    this.setHighlight(true);

    this.scene.time.delayedCall(2000, () => {
      this.setHighlight(false);
    });
  }
}
