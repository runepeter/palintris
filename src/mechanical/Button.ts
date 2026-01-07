import Phaser from 'phaser';
import type { ButtonElement, MechanicalAction } from '../types';

export class Button extends Phaser.GameObjects.Container {
  private config: ButtonElement;
  private buttonSprite: Phaser.GameObjects.Image;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private isPressed = false;
  private isDisabled = false;

  public onPress?: (button: Button, action: MechanicalAction) => void;

  constructor(scene: Phaser.Scene, config: ButtonElement) {
    super(scene, config.gridX, config.gridY);
    this.config = config;

    // Create glow effect (behind button)
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);

    // Create button sprite
    const spriteKey = `button_${config.color}`;
    this.buttonSprite = scene.add.image(0, 0, spriteKey);
    this.buttonSprite.setDisplaySize(80, 32);
    this.add(this.buttonSprite);

    // Make interactive
    if (config.interactive) {
      this.setSize(80, 32);
      this.setInteractive({ useHandCursor: true });
      this.setupInteraction();
    }

    scene.add.existing(this);
  }

  private setupInteraction(): void {
    this.on('pointerover', () => {
      if (!this.isDisabled) {
        this.showHoverEffect();
      }
    });

    this.on('pointerout', () => {
      this.hideHoverEffect();
    });

    this.on('pointerdown', () => {
      if (!this.isDisabled) {
        this.press();
      }
    });
  }

  private showHoverEffect(): void {
    const color = this.getButtonColor();
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(color, 0.3);
    this.glowGraphics.fillRoundedRect(-45, -22, 90, 44, 8);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.05,
      scaleY: 1.05,
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

  private getButtonColor(): number {
    switch (this.config.color) {
      case 'blue':
        return 0x4488ff;
      case 'yellow':
        return 0xffdd44;
      case 'grey':
      default:
        return 0x888888;
    }
  }

  public press(): void {
    if (this.isDisabled || (this.config.oneShot && this.isPressed)) return;

    this.isPressed = true;

    // Press animation - button goes down
    this.scene.tweens.add({
      targets: this.buttonSprite,
      scaleY: 0.7,
      y: 4,
      duration: 100,
      ease: 'Power2',
      onComplete: () => {
        // Button comes back up (if not one-shot)
        if (!this.config.oneShot) {
          this.scene.tweens.add({
            targets: this.buttonSprite,
            scaleY: 1,
            y: 0,
            duration: 150,
            ease: 'Back.easeOut',
          });
        }
      },
    });

    // Create press effect
    this.createPressEffect();

    // Trigger action
    if (this.onPress !== undefined) {
      this.onPress(this, this.config.triggersAction);
    }

    // If one-shot, disable the button
    if (this.config.oneShot) {
      this.isDisabled = true;
      this.buttonSprite.setTint(0x666666);
    }
  }

  private createPressEffect(): void {
    const color = this.getButtonColor();

    // Ripple effect
    const ripple = this.scene.add.circle(this.x, this.y, 20, color, 0.5);
    this.scene.tweens.add({
      targets: ripple,
      scale: 3,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ripple.destroy(),
    });

    // Particle burst
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const x = Math.cos(angle) * 20;
      const y = Math.sin(angle) * 10;

      let particle: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (this.scene.textures.exists('particle_yellow_1')) {
        particle = this.scene.add.image(this.x + x, this.y + y, 'particle_yellow_1');
        particle.setScale(0.25);
        particle.setTint(color);
      } else {
        particle = this.scene.add.circle(this.x + x, this.y + y, 4, color);
      }

      this.scene.tweens.add({
        targets: particle,
        x: this.x + x * 3,
        y: this.y + y * 3,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  public reset(): void {
    this.isPressed = false;
    this.isDisabled = false;
    this.buttonSprite.clearTint();
    this.buttonSprite.setScale(1);
    this.buttonSprite.y = 0;
  }

  public getConfig(): ButtonElement {
    return this.config;
  }

  public getAction(): MechanicalAction {
    return this.config.triggersAction;
  }

  public isButtonPressed(): boolean {
    return this.isPressed;
  }

  public setHighlight(enabled: boolean): void {
    if (enabled) {
      const color = this.getButtonColor();
      this.glowGraphics.clear();
      this.glowGraphics.fillStyle(color, 0.4);
      this.glowGraphics.fillRoundedRect(-50, -28, 100, 56, 10);

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
}
