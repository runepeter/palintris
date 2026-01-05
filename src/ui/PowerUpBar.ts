import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';
import { POWER_UPS, type PowerUpType } from '../game/PowerUps';
import { loadPowerUps, usePowerUp } from '../utils/storage';

export class PowerUpBar extends Phaser.GameObjects.Container {
  private powerUpButtons: Map<PowerUpType, Phaser.GameObjects.Container> = new Map();
  private countLabels: Map<PowerUpType, Phaser.GameObjects.Text> = new Map();
  private onUse: (type: PowerUpType) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onUse: (type: PowerUpType) => void
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.onUse = onUse;
    this.createPowerUpButtons();
  }

  private createPowerUpButtons(): void {
    const inventory = loadPowerUps();
    const activePowerUps: PowerUpType[] = ['hint', 'extra_move', 'extra_time', 'undo_all'];

    let xOffset = 0;
    const buttonSize = 50;
    const spacing = 10;

    for (const type of activePowerUps) {
      const powerUp = POWER_UPS[type];
      const count = inventory[type];

      const btn = this.scene.add.container(xOffset, 0);

      // Background
      const bg = this.scene.add.graphics();
      bg.fillStyle(count > 0 ? COLORS.secondary : 0x1a1a2a, 1);
      bg.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8);
      if (count > 0) {
        bg.lineStyle(2, powerUp.color, 0.8);
        bg.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8);
      }

      // Icon
      const icon = this.scene.add.text(0, -5, powerUp.icon, {
        fontSize: '24px',
      });
      icon.setOrigin(0.5, 0.5);

      // Count badge
      const countBg = this.scene.add.circle(15, -15, 12, count > 0 ? powerUp.color : 0x444444);
      const countLabel = this.scene.add.text(15, -15, count.toString(), {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      countLabel.setOrigin(0.5, 0.5);

      btn.add([bg, icon, countBg, countLabel]);
      btn.setSize(buttonSize, buttonSize);

      if (count > 0) {
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => {
          bg.clear();
          bg.fillStyle(COLORS.tertiary, 1);
          bg.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8);
          bg.lineStyle(2, powerUp.color, 1);
          bg.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8);
          btn.setScale(1.1);

          this.showTooltip(btn.x, btn.y - 40, powerUp.name, powerUp.description);
        });

        btn.on('pointerout', () => {
          bg.clear();
          bg.fillStyle(COLORS.secondary, 1);
          bg.fillRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8);
          bg.lineStyle(2, powerUp.color, 0.8);
          bg.strokeRoundedRect(-buttonSize / 2, -buttonSize / 2, buttonSize, buttonSize, 8);
          btn.setScale(1);

          this.hideTooltip();
        });

        btn.on('pointerdown', () => {
          if (usePowerUp(type)) {
            this.onUse(type);
            this.updateCount(type);
          }
        });
      }

      this.add(btn);
      this.powerUpButtons.set(type, btn);
      this.countLabels.set(type, countLabel);

      xOffset += buttonSize + spacing;
    }
  }

  private tooltip: Phaser.GameObjects.Container | null = null;

  private showTooltip(x: number, y: number, title: string, description: string): void {
    this.hideTooltip();

    this.tooltip = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    const width = Math.max(120, title.length * 8);
    bg.fillStyle(0x000000, 0.9);
    bg.fillRoundedRect(-width / 2 - 10, -30, width + 20, 50, 6);

    const titleText = this.scene.add.text(0, -20, title, {
      fontFamily: 'Arial',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    titleText.setOrigin(0.5, 0.5);

    const descText = this.scene.add.text(0, 0, description, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#aaaaaa',
    });
    descText.setOrigin(0.5, 0.5);

    this.tooltip.add([bg, titleText, descText]);
    this.add(this.tooltip);
  }

  private hideTooltip(): void {
    if (this.tooltip !== null) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  private updateCount(type: PowerUpType): void {
    const inventory = loadPowerUps();
    const count = inventory[type];
    const label = this.countLabels.get(type);

    if (label !== undefined) {
      label.setText(count.toString());

      if (count === 0) {
        const btn = this.powerUpButtons.get(type);
        btn?.disableInteractive();
      }
    }
  }

  public refresh(): void {
    const inventory = loadPowerUps();

    for (const [type, label] of this.countLabels) {
      label.setText(inventory[type].toString());
    }
  }
}
