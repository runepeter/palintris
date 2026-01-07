import Phaser from 'phaser';
import { COLORS, TILE_SIZE, TILE_BORDER_RADIUS, ANIMATION_DURATION } from '../config/gameConfig';
import type { Symbol } from '../types';

export class Tile extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private innerGlow: Phaser.GameObjects.Graphics;
  private symbolSprite: Phaser.GameObjects.Image | null = null;
  private symbolText: Phaser.GameObjects.Text;
  private symbol: Symbol;
  private index: number;
  private isSelected = false;
  private isHighlighted = false;
  private isPalindromeHighlight = false;
  private glowGraphics: Phaser.GameObjects.Graphics | null = null;
  private hoverGlow: Phaser.GameObjects.Graphics | null = null;
  private idleAnimation: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    symbol: Symbol,
    index: number
  ) {
    super(scene, x, y);

    this.symbol = symbol;
    this.index = index;

    // Inner glow layer (for depth)
    this.innerGlow = scene.add.graphics();

    // Background with gradient
    this.bg = scene.add.graphics();
    this.drawBackground();

    // Create sprite if symbol has one
    if (symbol.sprite !== undefined && scene.textures.exists(symbol.sprite)) {
      this.symbolSprite = scene.add.image(0, 0, symbol.sprite);
      this.symbolSprite.setDisplaySize(TILE_SIZE - 8, TILE_SIZE - 8);

      // For letters and numbers, show text on top of sprite
      if (symbol.category === 'letters' || symbol.category === 'numbers') {
        this.symbolText = scene.add.text(0, 0, symbol.display, {
          fontFamily: 'Arial Black, Arial',
          fontSize: '28px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
        });
        this.symbolText.setOrigin(0.5, 0.5);
        this.add([this.innerGlow, this.bg, this.symbolSprite, this.symbolText]);
      } else {
        // For shapes and colors, just show the sprite
        this.symbolText = scene.add.text(0, 0, '', {
          fontSize: '1px',
        });
        this.add([this.innerGlow, this.bg, this.symbolSprite]);
      }
    } else {
      // Fallback to text-only display
      this.symbolText = scene.add.text(0, 0, symbol.display, {
        fontFamily: 'Arial',
        fontSize: '32px',
        fontStyle: 'bold',
        color: `#${symbol.color.toString(16).padStart(6, '0')}`,
      });
      this.symbolText.setOrigin(0.5, 0.5);
      this.add([this.innerGlow, this.bg, this.symbolText]);
    }

    this.setSize(TILE_SIZE, TILE_SIZE);
    this.setInteractive({ useHandCursor: true });

    // Hover effects
    this.on('pointerover', () => this.onHoverStart());
    this.on('pointerout', () => this.onHoverEnd());

    // Start idle breathing animation
    this.startIdleAnimation();

    scene.add.existing(this);
  }

  private drawBackground(): void {
    this.bg.clear();
    this.innerGlow.clear();

    let bgColor: number = COLORS.tile.default;
    let bgColorLight: number = COLORS.tile.default;
    let borderColor: number = 0x555555;
    let borderWidth = 2;
    let alpha = 0.3;
    let glowColor: number = bgColor;

    if (this.isPalindromeHighlight) {
      bgColor = COLORS.tile.palindrome;
      bgColorLight = COLORS.successLight;
      borderColor = 0xffd700;
      borderWidth = 4;
      alpha = 0.5;
      glowColor = 0xffd700;
    } else if (this.isSelected) {
      bgColor = COLORS.tile.selected;
      bgColorLight = COLORS.accent;
      borderColor = 0xffffff;
      borderWidth = 4;
      alpha = 0.6;
      glowColor = COLORS.accent;
    } else if (this.isHighlighted) {
      bgColor = COLORS.tile.highlight;
      bgColorLight = COLORS.accentSecondary;
      borderColor = 0xaaaaaa;
      borderWidth = 3;
      alpha = 0.4;
      glowColor = COLORS.accentSecondary;
    } else {
      // Default colors with slight variation for depth
      bgColorLight = COLORS.secondary;
    }

    // Draw gradient background (approximated with two layers)
    // Bottom layer (darker)
    this.bg.fillStyle(bgColor, alpha);
    this.bg.fillRoundedRect(
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      TILE_BORDER_RADIUS
    );

    // Top layer gradient effect (lighter at top)
    this.bg.fillStyle(bgColorLight, alpha * 0.3);
    this.bg.fillRoundedRect(
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE / 2,
      { tl: TILE_BORDER_RADIUS, tr: TILE_BORDER_RADIUS, bl: 0, br: 0 }
    );

    // Inner glow for depth
    this.innerGlow.fillStyle(glowColor, 0.15);
    this.innerGlow.fillRoundedRect(
      -TILE_SIZE / 2 + 3,
      -TILE_SIZE / 2 + 3,
      TILE_SIZE - 6,
      TILE_SIZE - 6,
      TILE_BORDER_RADIUS - 2
    );

    // Border with gradient effect
    this.bg.lineStyle(borderWidth, borderColor, 0.8);
    this.bg.strokeRoundedRect(
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      TILE_BORDER_RADIUS
    );

    // Inner highlight on top edge
    if (this.isSelected || this.isPalindromeHighlight) {
      this.bg.lineStyle(1, 0xffffff, 0.3);
      this.bg.beginPath();
      this.bg.arc(
        -TILE_SIZE / 2 + TILE_BORDER_RADIUS,
        -TILE_SIZE / 2 + TILE_BORDER_RADIUS,
        TILE_BORDER_RADIUS - 2,
        Phaser.Math.DegToRad(180),
        Phaser.Math.DegToRad(270),
        false
      );
      this.bg.lineTo(TILE_SIZE / 2 - TILE_BORDER_RADIUS, -TILE_SIZE / 2 + 2);
      this.bg.strokePath();
    }
  }

  public getSymbol(): Symbol {
    return this.symbol;
  }

  public override getIndex(): number {
    return this.index;
  }

  public setIndex(index: number): void {
    this.index = index;
  }

  public setSymbol(symbol: Symbol): void {
    this.symbol = symbol;

    // Update sprite if available
    if (symbol.sprite !== undefined && this.scene.textures.exists(symbol.sprite)) {
      if (this.symbolSprite !== null) {
        this.symbolSprite.setTexture(symbol.sprite);
      } else {
        this.symbolSprite = this.scene.add.image(0, 0, symbol.sprite);
        this.symbolSprite.setDisplaySize(TILE_SIZE - 8, TILE_SIZE - 8);
        this.addAt(this.symbolSprite, 1);
      }

      // Update text for letters/numbers
      if (symbol.category === 'letters' || symbol.category === 'numbers') {
        this.symbolText.setText(symbol.display);
        this.symbolText.setVisible(true);
      } else {
        this.symbolText.setVisible(false);
      }
    } else {
      // Fallback to text
      this.symbolText.setText(symbol.display);
      this.symbolText.setColor(`#${symbol.color.toString(16).padStart(6, '0')}`);
      this.symbolText.setVisible(true);
      if (this.symbolSprite !== null) {
        this.symbolSprite.setVisible(false);
      }
    }
  }

  private onHoverStart(): void {
    if (!this.hoverGlow) {
      this.hoverGlow = this.scene.add.graphics();
      this.addAt(this.hoverGlow, 0); // Behind everything
    }

    // Draw glowing hover effect
    this.hoverGlow.clear();
    this.hoverGlow.fillStyle(COLORS.accent, 0.2);
    this.hoverGlow.fillRoundedRect(
      -TILE_SIZE / 2 - 4,
      -TILE_SIZE / 2 - 4,
      TILE_SIZE + 8,
      TILE_SIZE + 8,
      TILE_BORDER_RADIUS + 2
    );

    // Pulse the hover glow
    this.scene.tweens.add({
      targets: this.hoverGlow,
      alpha: 0.6,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    // Slight lift
    this.scene.tweens.add({
      targets: this,
      y: this.y - 2,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
  }

  private onHoverEnd(): void {
    if (this.hoverGlow) {
      this.scene.tweens.killTweensOf(this.hoverGlow);
      this.hoverGlow.destroy();
      this.hoverGlow = null;
    }

    // Return to original position
    const originalY = this.y + 2;
    this.scene.tweens.add({
      targets: this,
      y: originalY,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Cubic.easeOut',
    });
  }

  private startIdleAnimation(): void {
    // Gentle breathing/pulsing animation
    this.idleAnimation = this.scene.tweens.add({
      targets: this,
      alpha: 0.92,
      duration: 2000 + Math.random() * 1000, // Randomize slightly for organic feel
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopIdleAnimation(): void {
    if (this.idleAnimation) {
      this.idleAnimation.stop();
      this.idleAnimation = null;
      this.alpha = 1;
    }
  }

  public select(): void {
    if (this.isSelected) return;
    this.isSelected = true;
    this.drawBackground();

    // Stop idle animation during selection
    this.stopIdleAnimation();

    // Bouncy pop animation with rotation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      angle: this.angle + 5,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          duration: 150,
          ease: 'Elastic.easeOut',
        });
      },
    });
  }

  public deselect(): void {
    this.isSelected = false;
    this.drawBackground();

    // Restart idle animation
    this.startIdleAnimation();
  }

  public highlight(): void {
    this.isHighlighted = true;
    this.drawBackground();
  }

  public unhighlight(): void {
    this.isHighlighted = false;
    this.drawBackground();
  }

  public showPalindromeHighlight(): void {
    this.isPalindromeHighlight = true;
    this.drawBackground();

    // Add golden glow
    if (this.glowGraphics === null) {
      this.glowGraphics = this.scene.add.graphics();
      this.addAt(this.glowGraphics, 0);
    }

    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(0xffd700, 0.3);
    this.glowGraphics.fillRoundedRect(
      -TILE_SIZE / 2 - 6,
      -TILE_SIZE / 2 - 6,
      TILE_SIZE + 12,
      TILE_SIZE + 12,
      TILE_BORDER_RADIUS + 4
    );

    // Pulse animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: ANIMATION_DURATION.highlight,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });
  }

  public hidePalindromeHighlight(): void {
    this.isPalindromeHighlight = false;
    this.drawBackground();

    if (this.glowGraphics !== null) {
      this.glowGraphics.clear();
    }
  }

  public animateSwapTo(targetX: number, onComplete?: () => void): void {
    // Bouncy swap with arc motion
    const currentY = this.y;
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: currentY - 15, // Arc upward
      duration: ANIMATION_DURATION.swap / 2,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this,
          y: currentY,
          duration: ANIMATION_DURATION.swap / 2,
          ease: 'Bounce.easeOut',
          onComplete,
        });
      },
    });

    // Add rotation for extra juice
    this.scene.tweens.add({
      targets: this,
      angle: this.angle + 360,
      duration: ANIMATION_DURATION.swap,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.angle = 0; // Reset to 0
      },
    });
  }

  public animateInsert(fromY: number, onComplete?: () => void): void {
    this.y = fromY;
    this.alpha = 0;
    this.scaleX = 0.5;
    this.scaleY = 0.5;

    this.scene.tweens.add({
      targets: this,
      y: this.y + 100,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: ANIMATION_DURATION.insert,
      ease: 'Back.easeOut',
      onComplete,
    });
  }

  public animateDelete(onComplete?: () => void): void {
    // Add particle burst before deletion
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      angle: 180,
      y: this.y - 50,
      duration: ANIMATION_DURATION.delete,
      ease: 'Power2',
      onComplete: () => {
        onComplete?.();
        this.destroy();
      },
    });
  }

  public animateReplace(newSymbol: Symbol, onComplete?: () => void): void {
    // Flip animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      duration: ANIMATION_DURATION.replace / 2,
      ease: 'Power2',
      onComplete: () => {
        this.setSymbol(newSymbol);
        this.scene.tweens.add({
          targets: this,
          scaleX: 1,
          duration: ANIMATION_DURATION.replace / 2,
          ease: 'Back.easeOut',
          onComplete,
        });
      },
    });
  }

  public shake(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x - 5,
      duration: 50,
      yoyo: true,
      repeat: 5,
      ease: 'Sine.easeInOut',
    });
  }

  public showHint(): void {
    // Golden pulsing glow effect for hint
    const hintGlow = this.scene.add.graphics();
    hintGlow.fillStyle(0xffd700, 0.5);
    hintGlow.fillRoundedRect(
      -TILE_SIZE / 2 - 8,
      -TILE_SIZE / 2 - 8,
      TILE_SIZE + 16,
      TILE_SIZE + 16,
      TILE_BORDER_RADIUS + 4
    );
    this.addAt(hintGlow, 0);

    // Pulse animation with glow
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });

    // Animate glow alpha
    this.scene.tweens.add({
      targets: hintGlow,
      alpha: { from: 0.5, to: 0.8 },
      duration: 200,
      yoyo: true,
      repeat: 3,
    });

    // Remove glow after animation
    this.scene.time.delayedCall(1800, () => {
      hintGlow.destroy();
    });
  }
}
