import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../config/gameConfig';
import { getSymbolByDisplay } from '../config/symbols';
import { Tile } from '../ui/Tile';
import { ParticleEffects } from '../ui/ParticleEffects';
import { Gear, Pipe, Button } from '../mechanical';
import { isPalindrome } from '../utils/palindrome';
import { audio } from '../utils/audio';
import { markLevelCompleted, updateHighScore, addScore } from '../utils/storage';
import type {
  MechanicalLevelConfig,
  GearElement,
  PipeElement,
  ButtonElement,
  SymbolSlot,
  MechanicalAction,
  RotationDirection,
  Symbol,
} from '../types';

interface MechanicalGameSceneData {
  levelConfig: MechanicalLevelConfig;
}

export class MechanicalGameScene extends Phaser.Scene {
  private levelConfig: MechanicalLevelConfig | null = null;
  private tiles: Tile[] = [];
  private symbolSlots: SymbolSlot[] = [];
  private gears: Map<string, Gear> = new Map();
  private pipes: Map<string, Pipe> = new Map();
  private buttons: Map<string, Button> = new Map();
  private operationsUsed = 0;
  private isAnimating = false;
  private particles: ParticleEffects | null = null;
  private gridContainer: Phaser.GameObjects.Container | null = null;
  private hudContainer: Phaser.GameObjects.Container | null = null;
  private operationsText: Phaser.GameObjects.Text | null = null;
  private currentSequence: string[] = [];

  // Grid settings
  private readonly GRID_SIZE = 64;
  private readonly GRID_OFFSET_X = 100;
  private readonly GRID_OFFSET_Y = 120;

  constructor() {
    super({ key: 'MechanicalGameScene' });
  }

  init(data: MechanicalGameSceneData): void {
    this.levelConfig = data.levelConfig;
  }

  create(): void {
    if (this.levelConfig === null) {
      this.scene.start('LevelSelectScene');
      return;
    }

    // Reset state
    this.tiles = [];
    this.gears.clear();
    this.pipes.clear();
    this.buttons.clear();
    this.operationsUsed = 0;
    this.isAnimating = false;
    this.currentSequence = [...this.levelConfig.sequence];
    this.symbolSlots = [...this.levelConfig.symbolSlots];

    // Create particle effects
    this.particles = new ParticleEffects(this);
    this.particles.createBackgroundParticles();

    // Create background
    this.createBackground();

    // Create HUD
    this.createHUD();

    // Create grid container
    this.gridContainer = this.add.container(this.GRID_OFFSET_X, this.GRID_OFFSET_Y);

    // Create mechanical elements
    this.createMechanicalElements();

    // Create symbol tiles
    this.createSymbolTiles();

    // Create action buttons
    this.createActionButtons();

    // Setup keyboard
    this.setupKeyboard();
  }

  private createBackground(): void {
    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0f0f1a, 0x0f0f1a, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Grid pattern overlay
    const gridOverlay = this.add.graphics();
    gridOverlay.lineStyle(1, 0x2a2a4a, 0.3);

    for (let x = 0; x < GAME_WIDTH; x += this.GRID_SIZE) {
      gridOverlay.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += this.GRID_SIZE) {
      gridOverlay.lineBetween(0, y, GAME_WIDTH, y);
    }
  }

  private createHUD(): void {
    this.hudContainer = this.add.container(0, 0);

    // Level title
    const title = this.add.text(GAME_WIDTH / 2, 20, this.levelConfig?.name ?? 'Mechanical Puzzle', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0);
    this.hudContainer.add(title);

    // Operations counter
    const opsLabel = this.add.text(GAME_WIDTH - 180, 20, 'Moves:', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888899',
    });
    this.hudContainer.add(opsLabel);

    this.operationsText = this.add.text(GAME_WIDTH - 100, 20, `${this.operationsUsed}/${this.levelConfig?.mechanicalOperationsAllowed ?? 0}`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '18px',
      color: '#44cc88',
    });
    this.hudContainer.add(this.operationsText);

    // Level description
    const desc = this.add.text(GAME_WIDTH / 2, 55, this.levelConfig?.description ?? '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#666677',
    });
    desc.setOrigin(0.5, 0);
    this.hudContainer.add(desc);

    // Hints (if available)
    if (this.levelConfig?.hints !== undefined && this.levelConfig.hints.length > 0) {
      const hintText = this.add.text(GAME_WIDTH / 2, 80, `Hint: ${this.levelConfig.hints[0]}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        fontStyle: 'italic',
        color: '#ffaa44',
      });
      hintText.setOrigin(0.5, 0);
      this.hudContainer.add(hintText);
    }
  }

  private createMechanicalElements(): void {
    if (this.levelConfig === null || this.gridContainer === null) return;

    for (const element of this.levelConfig.mechanicalElements) {
      const x = element.gridX * this.GRID_SIZE;
      const y = element.gridY * this.GRID_SIZE;

      switch (element.type) {
        case 'gear':
          this.createGear(element as GearElement, x, y);
          break;
        case 'pipe':
          this.createPipe(element as PipeElement, x, y);
          break;
        case 'button':
          this.createButton(element as ButtonElement, x, y);
          break;
      }
    }
  }

  private createGear(config: GearElement, x: number, y: number): void {
    const gearConfig: GearElement = {
      ...config,
      gridX: x,
      gridY: y,
    };

    const gear = new Gear(this, gearConfig);
    gear.setPosition(x, y);

    // Set up rotation callback
    gear.onRotate = (g, direction) => {
      this.onGearRotate(g, direction);
    };

    this.gears.set(config.id, gear);
    this.gridContainer?.add(gear);
  }

  private createPipe(config: PipeElement, x: number, y: number): void {
    const pipeConfig: PipeElement = {
      ...config,
      gridX: x,
      gridY: y,
    };

    const pipe = new Pipe(this, pipeConfig);
    pipe.setPosition(x, y);

    // Set up rotation callback
    pipe.onRotate = () => {
      this.onPipeRotate(pipe);
    };

    this.pipes.set(config.id, pipe);
    this.gridContainer?.add(pipe);
  }

  private createButton(config: ButtonElement, x: number, y: number): void {
    const buttonConfig: ButtonElement = {
      ...config,
      gridX: x,
      gridY: y,
    };

    const button = new Button(this, buttonConfig);
    button.setPosition(x, y);

    // Set up press callback
    button.onPress = (b, action) => {
      this.onButtonPress(b, action);
    };

    this.buttons.set(config.id, button);
    this.gridContainer?.add(button);
  }

  private createSymbolTiles(): void {
    if (this.levelConfig === null || this.gridContainer === null) return;

    for (let i = 0; i < this.currentSequence.length; i++) {
      const display = this.currentSequence[i];
      const slot = this.symbolSlots[i];

      if (display === undefined || slot === undefined) continue;

      const symbol = getSymbolByDisplay(display, this.levelConfig.symbolCategory) ??
        this.createDefaultSymbol(display);

      const x = slot.gridX * this.GRID_SIZE;
      const y = slot.gridY * this.GRID_SIZE;

      const tile = new Tile(this, x, y, symbol, i);
      tile.setScale(0.8); // Slightly smaller for mechanical grid

      this.tiles.push(tile);
      this.gridContainer.add(tile);
    }

    this.updatePalindromeHighlight();
  }

  private createDefaultSymbol(display: string): Symbol {
    return {
      id: `default_${display}`,
      display,
      category: 'mixed',
      color: COLORS.text,
    };
  }

  private onGearRotate(gear: Gear, direction: RotationDirection): void {
    if (this.isAnimating || !this.canPerformOperation()) return;

    this.isAnimating = true;
    this.operationsUsed++;
    this.updateOperationsDisplay();

    audio.playRotate();

    // Get connected symbol indices
    const connectedIndices = gear.getConnectedSymbolIndices();

    if (connectedIndices.length >= 2) {
      // Rotate the symbols
      if (direction === 'clockwise') {
        this.rotateSymbolsClockwise(connectedIndices);
      } else {
        this.rotateSymbolsCounterclockwise(connectedIndices);
      }
    }

    // Animate tiles
    this.animateSymbolRotation(connectedIndices, direction, () => {
      this.isAnimating = false;
      this.checkCompletion();
    });
  }

  private onPipeRotate(_pipe: Pipe): void {
    if (!this.canPerformOperation()) return;

    this.operationsUsed++;
    this.updateOperationsDisplay();

    audio.playClick();

    // Check if this completes a pipe connection
    this.checkPipeConnections();
  }

  private onButtonPress(_button: Button, action: MechanicalAction): void {
    if (this.isAnimating || !this.canPerformOperation()) return;

    this.operationsUsed++;
    this.updateOperationsDisplay();

    audio.playClick();

    // Execute the action
    this.executeAction(action);
  }

  private executeAction(action: MechanicalAction): void {
    switch (action.type) {
      case 'rotate_symbols':
        if (action.symbolIndices !== undefined) {
          const dir = action.direction as RotationDirection ?? 'clockwise';
          if (dir === 'clockwise') {
            this.rotateSymbolsClockwise(action.symbolIndices);
          } else {
            this.rotateSymbolsCounterclockwise(action.symbolIndices);
          }
          this.animateSymbolRotation(action.symbolIndices, dir, () => {
            this.checkCompletion();
          });
        }
        break;

      case 'shift_symbols':
        if (action.symbolIndices !== undefined && action.amount !== undefined) {
          this.shiftSymbols(action.symbolIndices, action.amount);
        }
        break;

      case 'swap_symbols':
        if (action.symbolIndices !== undefined && action.symbolIndices.length >= 2) {
          const [idx1, idx2] = action.symbolIndices;
          if (idx1 !== undefined && idx2 !== undefined) {
            this.swapSymbols(idx1, idx2);
          }
        }
        break;

      case 'activate_element':
        if (action.targetIds !== undefined) {
          for (const id of action.targetIds) {
            const gear = this.gears.get(id);
            if (gear !== undefined) {
              gear.rotate('clockwise');
            }
          }
        }
        break;
    }
  }

  private rotateSymbolsClockwise(indices: number[]): void {
    if (indices.length < 2) return;

    // Save the last symbol
    const lastIdx = indices[indices.length - 1];
    if (lastIdx === undefined) return;
    const lastSymbol = this.currentSequence[lastIdx];

    // Shift all symbols one position
    for (let i = indices.length - 1; i > 0; i--) {
      const currentIdx = indices[i];
      const prevIdx = indices[i - 1];
      if (currentIdx !== undefined && prevIdx !== undefined) {
        this.currentSequence[currentIdx] = this.currentSequence[prevIdx] ?? '';
      }
    }

    // Put the last symbol at the first position
    const firstIdx = indices[0];
    if (firstIdx !== undefined && lastSymbol !== undefined) {
      this.currentSequence[firstIdx] = lastSymbol;
    }
  }

  private rotateSymbolsCounterclockwise(indices: number[]): void {
    if (indices.length < 2) return;

    // Save the first symbol
    const firstIdx = indices[0];
    if (firstIdx === undefined) return;
    const firstSymbol = this.currentSequence[firstIdx];

    // Shift all symbols one position
    for (let i = 0; i < indices.length - 1; i++) {
      const currentIdx = indices[i];
      const nextIdx = indices[i + 1];
      if (currentIdx !== undefined && nextIdx !== undefined) {
        this.currentSequence[currentIdx] = this.currentSequence[nextIdx] ?? '';
      }
    }

    // Put the first symbol at the last position
    const lastIdx = indices[indices.length - 1];
    if (lastIdx !== undefined && firstSymbol !== undefined) {
      this.currentSequence[lastIdx] = firstSymbol;
    }
  }

  private shiftSymbols(indices: number[], amount: number): void {
    const symbols = indices.map(i => this.currentSequence[i] ?? '');
    const shifted = [...symbols.slice(-amount), ...symbols.slice(0, -amount)];

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      const symbol = shifted[i];
      if (idx !== undefined && symbol !== undefined) {
        this.currentSequence[idx] = symbol;
      }
    }

    this.rebuildTiles();
  }

  private swapSymbols(idx1: number, idx2: number): void {
    const temp = this.currentSequence[idx1];
    const symbol2 = this.currentSequence[idx2];
    if (temp !== undefined && symbol2 !== undefined) {
      this.currentSequence[idx1] = symbol2;
      this.currentSequence[idx2] = temp;
    }

    this.rebuildTiles();
    this.checkCompletion();
  }

  private animateSymbolRotation(indices: number[], direction: RotationDirection, onComplete: () => void): void {
    // Animate tiles moving to new positions
    const delay = direction === 'clockwise' ? 0 : 50;

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      if (idx === undefined) continue;

      const tile = this.tiles[idx];
      const slot = this.symbolSlots[idx];
      if (tile === undefined || slot === undefined) continue;

      // Calculate target positions for potential future animation
      const _targetX = slot.gridX * this.GRID_SIZE;
      const _targetY = slot.gridY * this.GRID_SIZE;
      void _targetX; // Suppress unused warning
      void _targetY; // Suppress unused warning

      this.tweens.add({
        targets: tile,
        scaleX: 0.6,
        scaleY: 0.6,
        duration: 150,
        yoyo: true,
        delay: delay + i * 30,
      });
    }

    // After animation, rebuild tiles with new order
    this.time.delayedCall(400, () => {
      this.rebuildTiles();
      onComplete();
    });
  }

  private rebuildTiles(): void {
    if (this.levelConfig === null || this.gridContainer === null) return;

    // Remove old tiles
    for (const tile of this.tiles) {
      tile.destroy();
    }
    this.tiles = [];

    // Create new tiles
    for (let i = 0; i < this.currentSequence.length; i++) {
      const display = this.currentSequence[i];
      const slot = this.symbolSlots[i];

      if (display === undefined || slot === undefined) continue;

      const symbol = getSymbolByDisplay(display, this.levelConfig.symbolCategory) ??
        this.createDefaultSymbol(display);

      const x = slot.gridX * this.GRID_SIZE;
      const y = slot.gridY * this.GRID_SIZE;

      const tile = new Tile(this, x, y, symbol, i);
      tile.setScale(0.8);

      this.tiles.push(tile);
      this.gridContainer.add(tile);
    }

    this.updatePalindromeHighlight();
  }

  private checkPipeConnections(): void {
    // Check if all pipes form a valid connected path
    // This can trigger special effects or unlock goals
    // For now, just update the display
    this.updatePalindromeHighlight();
  }

  private canPerformOperation(): boolean {
    if (this.levelConfig === null) return false;
    return this.operationsUsed < this.levelConfig.mechanicalOperationsAllowed;
  }

  private updateOperationsDisplay(): void {
    if (this.operationsText !== null && this.levelConfig !== null) {
      this.operationsText.setText(`${this.operationsUsed}/${this.levelConfig.mechanicalOperationsAllowed}`);

      // Warning color when low on moves
      const remaining = this.levelConfig.mechanicalOperationsAllowed - this.operationsUsed;
      if (remaining <= 2) {
        this.operationsText.setColor('#ff4444');
      } else if (remaining <= 5) {
        this.operationsText.setColor('#ffaa44');
      } else {
        this.operationsText.setColor('#44cc88');
      }
    }
  }

  private updatePalindromeHighlight(): void {
    const isPalin = isPalindrome(this.currentSequence);

    for (const tile of this.tiles) {
      if (isPalin) {
        tile.showPalindromeHighlight();
      } else {
        tile.hidePalindromeHighlight();
      }
    }
  }

  private checkCompletion(): void {
    if (this.levelConfig === null) return;

    const goal = this.levelConfig.goalCondition;
    let isComplete = false;

    switch (goal.type) {
      case 'palindrome':
        isComplete = isPalindrome(this.currentSequence);
        if (goal.palindromeMinLength !== undefined) {
          isComplete = isComplete && this.currentSequence.length >= goal.palindromeMinLength;
        }
        break;

      case 'sequence':
        if (goal.targetSequence !== undefined) {
          isComplete = this.currentSequence.join('') === goal.targetSequence.join('');
        }
        break;

      case 'positions':
        // Check if specific symbols are in specific positions
        if (goal.targetPositions !== undefined) {
          isComplete = true;
          for (const [symbol, position] of Object.entries(goal.targetPositions)) {
            if (this.currentSequence[position] !== symbol) {
              isComplete = false;
              break;
            }
          }
        }
        break;
    }

    if (isComplete) {
      this.onLevelComplete();
    } else if (!this.canPerformOperation()) {
      this.onOutOfMoves();
    }
  }

  private onLevelComplete(): void {
    if (this.levelConfig === null) return;

    audio.playSuccess();

    // Celebration effects
    if (this.particles !== null) {
      this.particles.celebrationBurst(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      this.particles.confettiRain(2000);

      const tilePositions = this.tiles.map(tile => ({
        x: (this.gridContainer?.x ?? 0) + tile.x,
        y: (this.gridContainer?.y ?? 0) + tile.y,
      }));
      this.particles.palindromeRainbow(tilePositions);
    }

    // Calculate score
    const baseScore = 1000;
    const efficiencyBonus = Math.max(0, (this.levelConfig.mechanicalOperationsAllowed - this.operationsUsed) * 50);
    const totalScore = baseScore + efficiencyBonus;

    // Save progress
    markLevelCompleted(this.levelConfig.id);
    updateHighScore(this.levelConfig.id, totalScore);
    addScore(totalScore);

    // Show success modal
    this.showSuccessModal(totalScore);
  }

  private onOutOfMoves(): void {
    audio.playFailure();

    if (this.particles !== null) {
      this.particles.failureEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }

    this.showFailureModal('Out of moves!');
  }

  private showSuccessModal(score: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-200, -150, 400, 300, 20);
    bg.lineStyle(3, 0x44cc88, 1);
    bg.strokeRoundedRect(-200, -150, 400, 300, 20);

    const title = this.add.text(0, -110, 'Level Complete!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#44cc88',
    });
    title.setOrigin(0.5, 0.5);

    const scoreText = this.add.text(0, -50, `Score: ${score.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
    });
    scoreText.setOrigin(0.5, 0.5);

    const movesText = this.add.text(0, -10, `Moves used: ${this.operationsUsed}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888899',
    });
    movesText.setOrigin(0.5, 0.5);

    modal.add([bg, title, scoreText, movesText]);

    // Buttons
    this.createModalButton(modal, 0, 50, 'Continue', () => {
      this.scene.start('LevelSelectScene');
    });

    this.createModalButton(modal, 0, 110, 'Retry', () => {
      this.scene.restart();
    });

    modal.setScale(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private showFailureModal(message: string): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-200, -120, 400, 240, 20);
    bg.lineStyle(3, 0xff4444, 1);
    bg.strokeRoundedRect(-200, -120, 400, 240, 20);

    const title = this.add.text(0, -80, message, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: '#ff4444',
    });
    title.setOrigin(0.5, 0.5);

    const subtitle = this.add.text(0, -40, 'Try a different approach!', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888899',
    });
    subtitle.setOrigin(0.5, 0.5);

    modal.add([bg, title, subtitle]);

    this.createModalButton(modal, 0, 20, 'Retry', () => {
      this.scene.restart();
    });

    this.createModalButton(modal, 0, 80, 'Level Select', () => {
      this.scene.start('LevelSelectScene');
    });

    modal.setScale(0);
    this.tweens.add({
      targets: modal,
      scaleX: 1,
      scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  private createModalButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): void {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a4a, 1);
    bg.fillRoundedRect(-80, -18, 160, 36, 8);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    btn.add([bg, label]);
    btn.setSize(160, 36);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x44aa88, 1);
      bg.fillRoundedRect(-80, -18, 160, 36, 8);
    });

    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x2a2a4a, 1);
      bg.fillRoundedRect(-80, -18, 160, 36, 8);
    });

    btn.on('pointerdown', () => {
      audio.playClick();
      callback();
    });

    container.add(btn);
  }

  private createActionButtons(): void {
    // Reset button
    const resetBtn = this.add.container(80, GAME_HEIGHT - 40);

    const resetBg = this.add.graphics();
    resetBg.fillStyle(0x2a2a4a, 1);
    resetBg.fillRoundedRect(-50, -18, 100, 36, 8);

    const resetLabel = this.add.text(0, 0, 'Reset', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });
    resetLabel.setOrigin(0.5, 0.5);

    resetBtn.add([resetBg, resetLabel]);
    resetBtn.setSize(100, 36);
    resetBtn.setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      audio.playClick();
      this.scene.restart();
    });

    // Back button
    const backBtn = this.add.container(GAME_WIDTH - 80, GAME_HEIGHT - 40);

    const backBg = this.add.graphics();
    backBg.fillStyle(0x2a2a4a, 1);
    backBg.fillRoundedRect(-50, -18, 100, 36, 8);

    const backLabel = this.add.text(0, 0, 'Menu', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });
    backLabel.setOrigin(0.5, 0.5);

    backBtn.add([backBg, backLabel]);
    backBtn.setSize(100, 36);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      audio.playClick();
      this.scene.start('LevelSelectScene');
    });
  }

  private setupKeyboard(): void {
    // R for reset
    this.input.keyboard?.on('keydown-R', () => {
      this.scene.restart();
    });

    // Escape to go back
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('LevelSelectScene');
    });
  }
}
