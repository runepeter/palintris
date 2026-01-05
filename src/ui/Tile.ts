import Phaser from 'phaser';
import { COLORS, TILE_SIZE, TILE_BORDER_RADIUS, ANIMATION_DURATION } from '../config/gameConfig';
import type { Symbol } from '../types';

export class Tile extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private symbolText: Phaser.GameObjects.Text;
  private symbol: Symbol;
  private index: number;
  private isSelected = false;
  private isHighlighted = false;
  private isPalindromeHighlight = false;

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

    // Symbol text
    this.symbolText = scene.add.text(0, 0, symbol.display, {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: `#${symbol.color.toString(16).padStart(6, '0')}`,
    });
    this.symbolText.setOrigin(0.5, 0.5);

    this.add([this.bg, this.symbolText]);
    this.setSize(TILE_SIZE, TILE_SIZE);
    this.setInteractive({ useHandCursor: true });

    scene.add.existing(this);
  }

  private drawBackground(): void {
    this.bg.clear();

    let bgColor: number = COLORS.tile.default;
    let borderColor: number = 0x555555;
    let borderWidth = 2;

    if (this.isPalindromeHighlight) {
      bgColor = COLORS.tile.palindrome;
      borderColor = 0xffffff;
      borderWidth = 3;
    } else if (this.isSelected) {
      bgColor = COLORS.tile.selected;
      borderColor = 0xffffff;
      borderWidth = 3;
    } else if (this.isHighlighted) {
      bgColor = COLORS.tile.highlight;
      borderColor = 0xaaaaaa;
      borderWidth = 2;
    }

    this.bg.fillStyle(bgColor, 1);
    this.bg.fillRoundedRect(
      -TILE_SIZE / 2,
      -TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      TILE_BORDER_RADIUS
    );

    this.bg.lineStyle(borderWidth, borderColor, 1);
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
    this.symbolText.setText(symbol.display);
    this.symbolText.setColor(`#${symbol.color.toString(16).padStart(6, '0')}`);
  }

  public select(): void {
    if (this.isSelected) return;
    this.isSelected = true;
    this.drawBackground();

    // Pop animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
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

    // Pulse animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: ANIMATION_DURATION.highlight,
      yoyo: true,
      repeat: 2,
    });
  }

  public hidePalindromeHighlight(): void {
    this.isPalindromeHighlight = false;
    this.drawBackground();
  }

  public animateSwapTo(targetX: number, onComplete?: () => void): void {
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      duration: ANIMATION_DURATION.swap,
      ease: 'Power2',
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
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
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
          ease: 'Power2',
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
    });
  }

  public showHint(): void {
    // Yellow glow effect for hint
    const hintGlow = this.scene.add.graphics();
    hintGlow.fillStyle(0xffd700, 0.4);
    hintGlow.fillRoundedRect(
      -TILE_SIZE / 2 - 5,
      -TILE_SIZE / 2 - 5,
      TILE_SIZE + 10,
      TILE_SIZE + 10,
      TILE_BORDER_RADIUS + 2
    );
    this.addAt(hintGlow, 0);

    // Pulse animation
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 200,
      yoyo: true,
      repeat: 2,
    });

    // Remove glow after animation
    this.scene.time.delayedCall(1500, () => {
      hintGlow.destroy();
    });
  }
}
