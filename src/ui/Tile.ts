import Phaser from 'phaser';
import { COLORS, TILE_SIZE, TILE_BORDER_RADIUS, ANIMATION_DURATION } from '../config/gameConfig';
import type { Symbol } from '../types';

export class Tile extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private symbolSprite: Phaser.GameObjects.Image | null = null;
  private symbolText: Phaser.GameObjects.Text;
  private symbol: Symbol;
  private index: number;
  private isSelected = false;
  private isHighlighted = false;
  private isPalindromeHighlight = false;
  private glowGraphics: Phaser.GameObjects.Graphics | null = null;

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

    // Background
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
        this.add([this.bg, this.symbolSprite, this.symbolText]);
      } else {
        // For shapes and colors, just show the sprite
        this.symbolText = scene.add.text(0, 0, '', {
          fontSize: '1px',
        });
        this.add([this.bg, this.symbolSprite]);
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
      this.add([this.bg, this.symbolText]);
    }

    this.setSize(TILE_SIZE, TILE_SIZE);
    this.setInteractive({ useHandCursor: true });

    scene.add.existing(this);
  }

  private drawBackground(): void {
    this.bg.clear();

    let bgColor: number = COLORS.tile.default;
    let borderColor: number = 0x555555;
    let borderWidth = 2;
    let alpha = 0.3;

    if (this.isPalindromeHighlight) {
      bgColor = COLORS.tile.palindrome;
      borderColor = 0xffd700;
      borderWidth = 4;
      alpha = 0.5;
    } else if (this.isSelected) {
      bgColor = COLORS.tile.selected;
      borderColor = 0xffffff;
      borderWidth = 4;
      alpha = 0.6;
    } else if (this.isHighlighted) {
      bgColor = COLORS.tile.highlight;
      borderColor = 0xaaaaaa;
      borderWidth = 3;
      alpha = 0.4;
    }

    // Draw subtle background
    this.bg.fillStyle(bgColor, alpha);
    this.bg.fillRoundedRect(
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      TILE_BORDER_RADIUS
    );

    this.bg.lineStyle(borderWidth, borderColor, 0.8);
    this.bg.strokeRoundedRect(
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      TILE_BORDER_RADIUS
    );
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

  public select(): void {
    if (this.isSelected) return;
    this.isSelected = true;
    this.drawBackground();

    // Pop animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  public deselect(): void {
    this.isSelected = false;
    this.drawBackground();
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
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      duration: ANIMATION_DURATION.swap,
      ease: 'Back.easeInOut',
      onComplete,
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
