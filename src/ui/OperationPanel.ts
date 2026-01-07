import Phaser from 'phaser';
import { COLORS } from '../config/gameConfig';
import { OPERATIONS } from '../config/operations';
import type { OperationType } from '../types';

export class OperationPanel extends Phaser.GameObjects.Container {
  private buttons: Map<OperationType, Phaser.GameObjects.Container> = new Map();
  private selectedOperation: OperationType | null = null;
  private onOperationSelect: ((op: OperationType) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    allowedOperations: OperationType[]
  ) {
    super(scene, x, y);

    this.createPanel(allowedOperations);
    scene.add.existing(this);
  }

  private createPanel(allowedOperations: OperationType[]): void {
    const buttonWidth = 75;
    const buttonHeight = 54;
    const spacing = 8;
    const totalWidth = allowedOperations.length * (buttonWidth + spacing) - spacing;
    let startX = -totalWidth / 2 + buttonWidth / 2;

    for (const opType of allowedOperations) {
      const operation = OPERATIONS[opType];
      const button = this.createButton(startX, 0, buttonWidth, buttonHeight, operation);
      this.buttons.set(opType, button);
      startX += buttonWidth + spacing;
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    operation: typeof OPERATIONS[OperationType]
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
    bg.lineStyle(1, COLORS.secondary, 0.6);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);

    const icon = this.scene.add.text(0, -8, operation.icon, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#f0f6fc',
    });
    icon.setOrigin(0.5, 0.5);

    const label = this.scene.add.text(0, 16, operation.name, {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#8b949e',
    });
    label.setOrigin(0.5, 0.5);

    container.add([bg, icon, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.setData('bg', bg);
    container.setData('icon', icon);
    container.setData('label', label);
    container.setData('operation', operation.type);

    container.on('pointerover', () => {
      if (this.selectedOperation !== operation.type) {
        bg.clear();
        bg.fillStyle(COLORS.secondary, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
        bg.lineStyle(1, COLORS.accent, 0.5);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      }
    });

    container.on('pointerout', () => {
      if (this.selectedOperation !== operation.type) {
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
        bg.lineStyle(1, COLORS.secondary, 0.6);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      }
    });

    container.on('pointerdown', () => {
      this.selectOperation(operation.type);
    });

    this.add(container);
    return container;
  }

  public selectOperation(opType: OperationType): void {
    const width = 75;
    const height = 54;

    // Deselect previous
    if (this.selectedOperation !== null) {
      const prevButton = this.buttons.get(this.selectedOperation);
      if (prevButton !== undefined) {
        const bg = prevButton.getData('bg') as Phaser.GameObjects.Graphics;
        const icon = prevButton.getData('icon') as Phaser.GameObjects.Text;
        const label = prevButton.getData('label') as Phaser.GameObjects.Text;
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
        bg.lineStyle(1, COLORS.secondary, 0.6);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
        icon.setColor('#f0f6fc');
        label.setColor('#8b949e');
      }
    }

    // Select new
    this.selectedOperation = opType;
    const button = this.buttons.get(opType);
    if (button !== undefined) {
      const bg = button.getData('bg') as Phaser.GameObjects.Graphics;
      const icon = button.getData('icon') as Phaser.GameObjects.Text;
      const label = button.getData('label') as Phaser.GameObjects.Text;
      bg.clear();
      bg.fillStyle(COLORS.accent, 0.2);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
      bg.lineStyle(2, COLORS.accent, 1);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
      icon.setColor('#58a6ff');
      label.setColor('#58a6ff');
    }

    this.onOperationSelect?.(opType);
  }

  public getSelectedOperation(): OperationType | null {
    return this.selectedOperation;
  }

  public clearSelection(): void {
    const width = 75;
    const height = 54;

    if (this.selectedOperation !== null) {
      const button = this.buttons.get(this.selectedOperation);
      if (button !== undefined) {
        const bg = button.getData('bg') as Phaser.GameObjects.Graphics;
        const icon = button.getData('icon') as Phaser.GameObjects.Text;
        const label = button.getData('label') as Phaser.GameObjects.Text;
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 6);
        bg.lineStyle(1, COLORS.secondary, 0.6);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 6);
        icon.setColor('#f0f6fc');
        label.setColor('#8b949e');
      }
    }
    this.selectedOperation = null;
  }

  public setOnOperationSelect(callback: (op: OperationType) => void): void {
    this.onOperationSelect = callback;
  }

  public disableOperation(opType: OperationType): void {
    const button = this.buttons.get(opType);
    if (button !== undefined) {
      button.setAlpha(0.4);
      button.disableInteractive();
    }
  }

  public enableOperation(opType: OperationType): void {
    const button = this.buttons.get(opType);
    if (button !== undefined) {
      button.setAlpha(1);
      button.setInteractive({ useHandCursor: true });
    }
  }
}
