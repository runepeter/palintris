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
    const buttonWidth = 80;
    const buttonHeight = 60;
    const spacing = 10;
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
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.lineStyle(2, COLORS.accent, 0.5);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

    const icon = this.scene.add.text(0, -8, operation.icon, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    });
    icon.setOrigin(0.5, 0.5);

    const label = this.scene.add.text(0, 18, operation.name, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#aaaaaa',
    });
    label.setOrigin(0.5, 0.5);

    container.add([bg, icon, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.setData('bg', bg);
    container.setData('operation', operation.type);

    container.on('pointerover', () => {
      if (this.selectedOperation !== operation.type) {
        bg.clear();
        bg.fillStyle(COLORS.secondary, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, COLORS.accent, 0.8);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      }
    });

    container.on('pointerout', () => {
      if (this.selectedOperation !== operation.type) {
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
        bg.lineStyle(2, COLORS.accent, 0.5);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
      }
    });

    container.on('pointerdown', () => {
      this.selectOperation(operation.type);
    });

    this.add(container);
    return container;
  }

  public selectOperation(opType: OperationType): void {
    // Deselect previous
    if (this.selectedOperation !== null) {
      const prevButton = this.buttons.get(this.selectedOperation);
      if (prevButton !== undefined) {
        const bg = prevButton.getData('bg') as Phaser.GameObjects.Graphics;
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-40, -30, 80, 60, 8);
        bg.lineStyle(2, COLORS.accent, 0.5);
        bg.strokeRoundedRect(-40, -30, 80, 60, 8);
      }
    }

    // Select new
    this.selectedOperation = opType;
    const button = this.buttons.get(opType);
    if (button !== undefined) {
      const bg = button.getData('bg') as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(COLORS.accent, 1);
      bg.fillRoundedRect(-40, -30, 80, 60, 8);
      bg.lineStyle(3, 0xffffff, 1);
      bg.strokeRoundedRect(-40, -30, 80, 60, 8);
    }

    this.onOperationSelect?.(opType);
  }

  public getSelectedOperation(): OperationType | null {
    return this.selectedOperation;
  }

  public clearSelection(): void {
    if (this.selectedOperation !== null) {
      const button = this.buttons.get(this.selectedOperation);
      if (button !== undefined) {
        const bg = button.getData('bg') as Phaser.GameObjects.Graphics;
        bg.clear();
        bg.fillStyle(COLORS.primary, 1);
        bg.fillRoundedRect(-40, -30, 80, 60, 8);
        bg.lineStyle(2, COLORS.accent, 0.5);
        bg.strokeRoundedRect(-40, -30, 80, 60, 8);
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
