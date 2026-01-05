import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
  GAME_BALANCE,
} from '../config/gameConfig';
import { getLevelById, getNextLevel } from '../config/levels';
import { getSymbolByDisplay } from '../config/symbols';
import { PuzzleManager } from '../game/PuzzleManager';
import { Tile } from '../ui/Tile';
import { OperationPanel } from '../ui/OperationPanel';
import { HUD } from '../ui/HUD';
import { isPalindrome } from '../utils/palindrome';
import { audio } from '../utils/audio';
import { ParticleEffects } from '../ui/ParticleEffects';
import { PowerUpBar } from '../ui/PowerUpBar';
import type { PowerUpType } from '../game/PowerUps';
import {
  markLevelCompleted,
  markLevelSkipped,
  updateHighScore,
  addScore,
  getTokens,
  spendTokens,
  addTokens,
  incrementPalindromesFound,
  trackPerfectLevel,
  trackFastCompletion,
} from '../utils/storage';
import { getLevelReward, type LevelReward } from '../game/PowerUps';
import type { LevelConfig, Symbol, LevelResult } from '../types';

interface GameSceneData {
  levelId: number;
}

export class GameScene extends Phaser.Scene {
  private levelConfig: LevelConfig | null = null;
  private puzzleManager: PuzzleManager | null = null;
  private tiles: Tile[] = [];
  private selectedTileIndex: number | null = null;
  private operationPanel: OperationPanel | null = null;
  private hud: HUD | null = null;
  private isAnimating = false;
  private tilesContainer: Phaser.GameObjects.Container | null = null;
  private particles: ParticleEffects | null = null;
  private tokenDisplay: Phaser.GameObjects.Text | null = null;
  private freezeIndicator: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    const level = getLevelById(data.levelId);
    if (level === undefined) {
      this.scene.start('LevelSelectScene');
      return;
    }
    this.levelConfig = level;
  }

  create(): void {
    if (this.levelConfig === null) return;

    // Reset state
    this.tiles = [];
    this.selectedTileIndex = null;
    this.isAnimating = false;

    // Create particle effects
    this.particles = new ParticleEffects(this);

    // Create puzzle manager
    this.puzzleManager = new PuzzleManager(this.levelConfig);
    this.puzzleManager.setTimeCallbacks(
      (time) => this.hud?.updateTimer(time),
      () => this.onTimeExpired()
    );

    // Create HUD
    this.hud = new HUD(this, 40, this.levelConfig);

    // Create token display
    this.createTokenDisplay();

    // Create tiles container
    this.tilesContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40);

    // Create tiles
    this.createTiles();

    // Create operation panel
    this.operationPanel = new OperationPanel(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 120,
      this.levelConfig.allowedOperations
    );

    // Default select first operation
    if (this.levelConfig.allowedOperations.length > 0) {
      const firstOp = this.levelConfig.allowedOperations[0];
      if (firstOp !== undefined) {
        this.operationPanel.selectOperation(firstOp);
      }
    }

    // Create action buttons
    this.createActionButtons();

    // Level description
    this.createLevelDescription();

    // Keyboard shortcuts
    this.setupKeyboard();

    // Power-up bar
    new PowerUpBar(
      this,
      GAME_WIDTH / 2 - 120,
      55,
      (type) => this.onPowerUpUsed(type)
    );

    // Background particles for atmosphere
    this.particles.createBackgroundParticles();
  }

  private onPowerUpUsed(type: PowerUpType): void {
    if (this.puzzleManager === null || this.levelConfig === null) return;

    switch (type) {
      case 'hint':
        this.showHint();
        break;
      case 'extra_move':
        this.addExtraMove();
        break;
      case 'extra_time':
        this.addExtraTime();
        break;
      case 'undo_all':
        this.resetPuzzle();
        break;
      case 'freeze_time':
        this.freezeTime();
        break;
    }

    // Particle effect for power-up use
    if (this.particles !== null) {
      this.particles.collectEffect(GAME_WIDTH / 2, 55, COLORS.accent);
    }

    this.updateTokenDisplay();
  }

  private showHint(): void {
    // Highlight a tile that should be part of the palindrome
    if (this.tiles.length > 0) {
      const sequence = this.puzzleManager?.getSequence() ?? [];
      const midpoint = Math.floor(sequence.length / 2);

      // Find a mismatched pair
      for (let i = 0; i < midpoint; i++) {
        const left = sequence[i];
        const right = sequence[sequence.length - 1 - i];
        if (left !== right) {
          // Highlight both tiles
          this.tiles[i]?.showHint();
          this.tiles[sequence.length - 1 - i]?.showHint();
          break;
        }
      }
    }
  }

  private addExtraMove(): void {
    if (this.puzzleManager !== null) {
      const state = this.puzzleManager.getState();
      this.puzzleManager.addOperations(1);
      this.hud?.updateOperations(state.operationsRemaining + 1);
    }
  }

  private addExtraTime(): void {
    if (this.puzzleManager !== null && this.levelConfig?.timeLimit !== null) {
      this.puzzleManager.addTime(15);
    }
  }

  private resetPuzzle(): void {
    this.puzzleManager?.reset();
    this.rebuildTiles();
    this.clearSelection();
    if (this.levelConfig !== null) {
      this.hud?.updateOperations(this.levelConfig.maxOperations);
      if (this.levelConfig.timeLimit !== null) {
        this.hud?.updateTimer(this.levelConfig.timeLimit);
      }
    }
  }

  private freezeTime(): void {
    if (this.puzzleManager !== null) {
      this.puzzleManager.pauseTimer();

      // Show freeze effect
      if (this.particles !== null) {
        this.particles.sparkle(GAME_WIDTH / 2, 80, 20);
      }

      // Show freeze indicator
      this.freezeIndicator = this.add.text(GAME_WIDTH / 2, 100, '❄️ TIME FROZEN ❄️', {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#00ffff',
      });
      this.freezeIndicator.setOrigin(0.5, 0.5);

      // Pulse effect
      this.tweens.add({
        targets: this.freezeIndicator,
        alpha: 0.5,
        duration: 500,
        yoyo: true,
        repeat: 9, // 10 seconds total
      });

      // Schedule unfreeze
      this.time.delayedCall(10000, () => {
        this.puzzleManager?.resumeTimer();
        this.freezeIndicator?.destroy();
        this.freezeIndicator = null;
      });
    }
  }

  private createTokenDisplay(): void {
    const tokens = getTokens();

    // Token icon background
    const tokenBg = this.add.graphics();
    tokenBg.fillStyle(0x2a1a4a, 0.8);
    tokenBg.fillRoundedRect(GAME_WIDTH - 130, 10, 120, 36, 8);
    tokenBg.lineStyle(2, 0xffd700, 0.6);
    tokenBg.strokeRoundedRect(GAME_WIDTH - 130, 10, 120, 36, 8);

    // Token icon
    const tokenIcon = this.add.text(GAME_WIDTH - 120, 28, '🪙', {
      fontSize: '20px',
    });
    tokenIcon.setOrigin(0, 0.5);

    // Token count
    this.tokenDisplay = this.add.text(GAME_WIDTH - 90, 28, tokens.toString(), {
      fontFamily: 'Arial',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#ffd700',
    });
    this.tokenDisplay.setOrigin(0, 0.5);
  }

  private updateTokenDisplay(): void {
    if (this.tokenDisplay !== null) {
      const tokens = getTokens();
      this.tokenDisplay.setText(tokens.toString());
    }
  }

  private createTiles(): void {
    if (this.puzzleManager === null || this.levelConfig === null || this.tilesContainer === null) return;

    const sequence = this.puzzleManager.getSequence();
    const totalWidth = sequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = -totalWidth / 2 + TILE_SIZE / 2;

    for (let i = 0; i < sequence.length; i++) {
      const display = sequence[i];
      if (display === undefined) continue;

      const symbol = getSymbolByDisplay(display, this.levelConfig.symbolCategory) ??
        this.createDefaultSymbol(display);

      const tile = new Tile(
        this,
        startX + i * (TILE_SIZE + TILE_SPACING),
        0,
        symbol,
        i
      );

      tile.on('pointerdown', () => this.onTileClick(i));
      this.tiles.push(tile);
      this.tilesContainer.add(tile);
    }

    // Check if already a palindrome
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

  private onTileClick(index: number): void {
    if (this.isAnimating || this.puzzleManager === null || this.operationPanel === null) return;

    const selectedOperation = this.operationPanel.getSelectedOperation();
    if (selectedOperation === null) return;

    const tile = this.tiles[index];
    if (tile === undefined) return;

    switch (selectedOperation) {
      case 'swap':
        this.handleSwapClick(index);
        break;

      case 'rotate':
        this.handleRotateClick(index);
        break;

      case 'mirror':
        this.handleMirrorClick(index);
        break;

      case 'delete':
        this.handleDeleteClick(index);
        break;

      case 'insert':
        this.handleInsertClick(index);
        break;

      case 'replace':
        this.handleReplaceClick(index);
        break;
    }
  }

  private handleSwapClick(index: number): void {
    if (this.selectedTileIndex === null) {
      // First selection
      this.selectedTileIndex = index;
      this.tiles[index]?.select();
      this.highlightAdjacentTiles(index);
    } else if (Math.abs(this.selectedTileIndex - index) === 1) {
      // Adjacent tile selected - perform swap
      this.performSwap(this.selectedTileIndex, index);
    } else {
      // Non-adjacent - reselect
      this.clearSelection();
      this.selectedTileIndex = index;
      this.tiles[index]?.select();
      this.highlightAdjacentTiles(index);
    }
  }

  private handleRotateClick(index: number): void {
    if (this.selectedTileIndex === null) {
      // First click - select start of rotation range
      this.selectedTileIndex = index;
      this.tiles[index]?.select();
      this.highlightRangeTiles(index);
    } else {
      // Second click - perform rotation
      const start = Math.min(this.selectedTileIndex, index);
      const end = Math.max(this.selectedTileIndex, index);

      if (end - start >= 1) {
        this.performRotate(start, end, 'right');
      }
      this.clearSelection();
    }
  }

  private handleMirrorClick(index: number): void {
    if (this.selectedTileIndex === null) {
      this.selectedTileIndex = index;
      this.tiles[index]?.select();
      this.highlightRangeTiles(index);
    } else {
      const start = Math.min(this.selectedTileIndex, index);
      const end = Math.max(this.selectedTileIndex, index);

      if (end - start >= 1) {
        this.performMirror(start, end);
      }
      this.clearSelection();
    }
  }

  private handleDeleteClick(index: number): void {
    this.performDelete(index);
  }

  private handleInsertClick(index: number): void {
    // For simplicity, insert a duplicate of the clicked tile
    const tile = this.tiles[index];
    if (tile === undefined) return;
    this.performInsert(index, tile.getSymbol().display);
  }

  private handleReplaceClick(index: number): void {
    // Cycle through available symbols in the category
    if (this.levelConfig === null) return;

    const tile = this.tiles[index];
    if (tile === undefined) return;

    const sequence = this.puzzleManager?.getSequence() ?? [];
    const uniqueSymbols = [...new Set(sequence)];
    const currentDisplay = tile.getSymbol().display;
    const currentIdx = uniqueSymbols.indexOf(currentDisplay);
    const nextIdx = (currentIdx + 1) % uniqueSymbols.length;
    const nextSymbol = uniqueSymbols[nextIdx];

    if (nextSymbol !== undefined && nextSymbol !== currentDisplay) {
      this.performReplace(index, nextSymbol);
    }
  }

  private highlightAdjacentTiles(index: number): void {
    if (index > 0) {
      this.tiles[index - 1]?.highlight();
    }
    if (index < this.tiles.length - 1) {
      this.tiles[index + 1]?.highlight();
    }
  }

  private highlightRangeTiles(fromIndex: number): void {
    for (let i = 0; i < this.tiles.length; i++) {
      if (i !== fromIndex) {
        this.tiles[i]?.highlight();
      }
    }
  }

  private clearSelection(): void {
    this.selectedTileIndex = null;
    for (const tile of this.tiles) {
      tile.deselect();
      tile.unhighlight();
    }
  }

  private performSwap(pos1: number, pos2: number): void {
    if (this.puzzleManager === null || this.isAnimating) return;

    const success = this.puzzleManager.applyOperation('swap', pos1, {
      targetPosition: pos2,
    });

    if (success) {
      this.isAnimating = true;
      audio.playSwap();

      const tile1 = this.tiles[pos1];
      const tile2 = this.tiles[pos2];

      if (tile1 !== undefined && tile2 !== undefined) {
        const x1 = tile1.x;
        const x2 = tile2.x;

        // Get world positions for particles
        const worldPos1 = this.tilesContainer?.getWorldTransformMatrix().transformPoint(x1, 0);
        const worldPos2 = this.tilesContainer?.getWorldTransformMatrix().transformPoint(x2, 0);

        if (worldPos1 !== undefined && worldPos2 !== undefined && this.particles !== null) {
          const containerY = this.tilesContainer?.y ?? GAME_HEIGHT / 2 - 40;
          this.particles.swapEffect(
            worldPos1.x, containerY,
            worldPos2.x, containerY,
            tile1.getSymbol().color ?? COLORS.accentSecondary,
            tile2.getSymbol().color ?? COLORS.accent
          );
        }

        tile1.animateSwapTo(x2);
        tile2.animateSwapTo(x1, () => {
          // Swap in array
          this.tiles[pos1] = tile2;
          this.tiles[pos2] = tile1;
          tile1.setIndex(pos2);
          tile2.setIndex(pos1);

          this.isAnimating = false;
          this.clearSelection();
          this.updateAfterOperation();
        });
      }
    }
  }

  private performRotate(start: number, end: number, direction: 'left' | 'right'): void {
    if (this.puzzleManager === null || this.isAnimating) return;

    const success = this.puzzleManager.applyOperation('rotate', start, {
      start,
      end,
      direction,
    });

    if (success) {
      audio.playRotate();
      this.rebuildTiles();
      this.updateAfterOperation();
    }
  }

  private performMirror(start: number, end: number): void {
    if (this.puzzleManager === null || this.isAnimating) return;

    const success = this.puzzleManager.applyOperation('mirror', start, {
      start,
      end,
    });

    if (success) {
      audio.playMirror();
      this.rebuildTiles();
      this.updateAfterOperation();
    }
  }

  private performDelete(position: number): void {
    if (this.puzzleManager === null || this.isAnimating) return;

    const success = this.puzzleManager.applyOperation('delete', position);

    if (success) {
      audio.playClick();
      this.rebuildTiles();
      this.updateAfterOperation();
    }
  }

  private performInsert(position: number, symbol: string): void {
    if (this.puzzleManager === null || this.isAnimating) return;

    const success = this.puzzleManager.applyOperation('insert', position, {
      symbol,
    });

    if (success) {
      audio.playClick();
      this.rebuildTiles();
      this.updateAfterOperation();
    }
  }

  private performReplace(position: number, symbol: string): void {
    if (this.puzzleManager === null || this.isAnimating) return;

    const success = this.puzzleManager.applyOperation('replace', position, {
      symbol,
    });

    if (success) {
      const tile = this.tiles[position];
      const newSymbol = this.createDefaultSymbol(symbol);
      tile?.animateReplace(newSymbol, () => {
        this.updateAfterOperation();
      });
    }
  }

  private rebuildTiles(): void {
    if (this.puzzleManager === null || this.levelConfig === null || this.tilesContainer === null) return;

    // Remove old tiles
    for (const tile of this.tiles) {
      tile.destroy();
    }
    this.tiles = [];

    // Create new tiles
    const sequence = this.puzzleManager.getSequence();
    const totalWidth = sequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = -totalWidth / 2 + TILE_SIZE / 2;

    for (let i = 0; i < sequence.length; i++) {
      const display = sequence[i];
      if (display === undefined) continue;

      const symbol = getSymbolByDisplay(display, this.levelConfig.symbolCategory) ??
        this.createDefaultSymbol(display);

      const tile = new Tile(
        this,
        startX + i * (TILE_SIZE + TILE_SPACING),
        0,
        symbol,
        i
      );

      tile.on('pointerdown', () => this.onTileClick(i));
      this.tiles.push(tile);
      this.tilesContainer.add(tile);
    }
  }

  private updateAfterOperation(): void {
    if (this.puzzleManager === null || this.hud === null) return;

    const state = this.puzzleManager.getState();
    this.hud.updateOperations(state.operationsRemaining);

    this.updatePalindromeHighlight();

    // Check for completion
    if (this.puzzleManager.checkCompletion()) {
      this.onLevelComplete();
    } else if (state.operationsRemaining <= 0) {
      this.onOutOfMoves();
    }
  }

  private updatePalindromeHighlight(): void {
    if (this.puzzleManager === null) return;

    const sequence = this.puzzleManager.getSequence();
    const isPalin = isPalindrome(sequence);

    for (const tile of this.tiles) {
      if (isPalin) {
        tile.showPalindromeHighlight();
      } else {
        tile.hidePalindromeHighlight();
      }
    }
  }

  private onTimeExpired(): void {
    audio.playFailure();
    this.hud?.showTimeUp();
    this.showFailureModal('Time\'s up!');
  }

  private onOutOfMoves(): void {
    audio.playFailure();
    this.showFailureModal('Out of moves!');
  }

  private onLevelComplete(): void {
    if (this.puzzleManager === null || this.levelConfig === null) return;

    const result = this.puzzleManager.getResult();
    audio.playSuccess();

    // Celebration particles!
    if (this.particles !== null) {
      this.particles.celebrationBurst(GAME_WIDTH / 2, GAME_HEIGHT / 2);
      this.particles.confettiRain(2000);

      // Rainbow effect on tiles
      const tilePositions = this.tiles.map(tile => ({
        x: (this.tilesContainer?.x ?? 0) + tile.x,
        y: (this.tilesContainer?.y ?? 0) + tile.y,
      }));
      this.particles.palindromeRainbow(tilePositions);
    }

    // Save progress
    markLevelCompleted(this.levelConfig.id);
    updateHighScore(this.levelConfig.id, result.score);
    addScore(result.score);
    incrementPalindromesFound();

    // Calculate rewards
    const reward = getLevelReward(
      this.levelConfig.id,
      this.levelConfig.difficulty,
      result.score,
      result.bonusesAchieved.length
    );

    // Add tokens
    addTokens(reward.tokens);
    this.updateTokenDisplay();

    // Track achievements
    if (result.bonusesAchieved.includes('perfect')) {
      trackPerfectLevel();
    }
    if (result.timeSpent < 5) {
      trackFastCompletion();
    }

    // Show success modal with reward
    this.showSuccessModal(result, reward);
  }

  private showSuccessModal(result: LevelResult, reward?: LevelReward): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-220, -200, 440, 400, 20);
    bg.lineStyle(3, COLORS.success, 1);
    bg.strokeRoundedRect(-220, -200, 440, 400, 20);

    // Add glow effect
    const glow = this.add.graphics();
    glow.fillStyle(COLORS.success, 0.1);
    glow.fillRoundedRect(-230, -210, 460, 420, 25);
    modal.add(glow);

    const title = this.add.text(0, -160, '✨ Level Complete! ✨', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#00ff88',
    });
    title.setOrigin(0.5, 0.5);

    const scoreText = this.add.text(0, -100, `Score: ${result.score.toLocaleString()}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    });
    scoreText.setOrigin(0.5, 0.5);

    const opsText = this.add.text(0, -60, `Operations used: ${result.operationsUsed.length}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaaaa',
    });
    opsText.setOrigin(0.5, 0.5);

    const timeText = this.add.text(0, -25, `Time: ${result.timeSpent.toFixed(1)}s`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaaaa',
    });
    timeText.setOrigin(0.5, 0.5);

    modal.add([bg, title, scoreText, opsText, timeText]);

    // Bonuses
    let yOffset = 10;
    if (result.bonusesAchieved.length > 0) {
      const bonusText = this.add.text(0, yOffset, `🏆 Bonuses: ${result.bonusesAchieved.join(', ')}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffaa00',
      });
      bonusText.setOrigin(0.5, 0.5);
      modal.add(bonusText);
      yOffset += 35;
    }

    // Token reward
    if (reward !== undefined) {
      const tokenRewardText = this.add.text(0, yOffset, `🪙 +${reward.tokens} Tokens`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffd700',
      });
      tokenRewardText.setOrigin(0.5, 0.5);
      modal.add(tokenRewardText);

      // Animate token reward
      this.tweens.add({
        targets: tokenRewardText,
        scale: { from: 0, to: 1 },
        duration: 500,
        delay: 300,
        ease: 'Back.easeOut',
      });
    }

    // Buttons
    const nextLevel = getNextLevel(result.levelId);

    if (nextLevel !== undefined) {
      this.createModalButton(modal, 0, 110, 'Next Level →', () => {
        this.scene.restart({ levelId: nextLevel.id });
      });
    }

    this.createModalButton(modal, 0, 165, 'Level Select', () => {
      this.scene.start('LevelSelectScene');
    });

    // Animate modal
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
    // Failure particle effect
    if (this.particles !== null) {
      this.particles.failureEffect(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    }

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const modal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-200, -180, 400, 360, 20);
    bg.lineStyle(3, COLORS.error, 1);
    bg.strokeRoundedRect(-200, -180, 400, 360, 20);

    const title = this.add.text(0, -140, message, {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ff4444',
    });
    title.setOrigin(0.5, 0.5);

    const subtitle = this.add.text(0, -90, 'Don\'t give up!', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaaaa',
    });
    subtitle.setOrigin(0.5, 0.5);

    modal.add([bg, title, subtitle]);

    // Skip level option
    const tokens = getTokens();
    const skipCost = GAME_BALANCE.skipCost;
    const canSkip = tokens >= skipCost && this.levelConfig !== null;
    const nextLevel = this.levelConfig !== null ? getNextLevel(this.levelConfig.id) : undefined;

    if (nextLevel !== undefined) {
      const skipText = this.add.text(0, -40, `Skip Level (🪙 ${skipCost} tokens)`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: canSkip ? '#ffd700' : '#666666',
      });
      skipText.setOrigin(0.5, 0.5);
      modal.add(skipText);
    }

    this.createModalButton(modal, 0, 10, '↻ Try Again', () => {
      this.scene.restart({ levelId: this.levelConfig?.id ?? 1 });
    });

    if (nextLevel !== undefined && canSkip) {
      this.createModalButton(modal, 0, 70, `⏭ Skip Level`, () => {
        if (this.levelConfig !== null && spendTokens(skipCost)) {
          markLevelSkipped(this.levelConfig.id);
          this.scene.restart({ levelId: nextLevel.id });
        }
      }, 0xffa500);
    }

    this.createModalButton(modal, 0, 130, 'Level Select', () => {
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
    callback: () => void,
    customColor?: number
  ): void {
    const btn = this.add.container(x, y);
    const baseColor = customColor ?? COLORS.secondary;
    const hoverColor = customColor ?? COLORS.accent;

    const bg = this.add.graphics();
    bg.fillStyle(baseColor, 1);
    bg.fillRoundedRect(-100, -20, 200, 40, 8);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    btn.add([bg, label]);
    btn.setSize(200, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(hoverColor, 1);
      bg.fillRoundedRect(-100, -20, 200, 40, 8);
      btn.setScale(1.05);
    });

    btn.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(baseColor, 1);
      bg.fillRoundedRect(-100, -20, 200, 40, 8);
      btn.setScale(1);
    });

    btn.on('pointerdown', () => {
      audio.playClick();
      callback();
    });
    container.add(btn);
  }

  private createActionButtons(): void {
    // Undo button
    const undoBtn = this.add.container(80, GAME_HEIGHT - 40);

    const undoBg = this.add.graphics();
    undoBg.fillStyle(COLORS.primary, 1);
    undoBg.fillRoundedRect(-50, -20, 100, 40, 8);

    const undoLabel = this.add.text(0, 0, '↩ Undo', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    undoLabel.setOrigin(0.5, 0.5);

    undoBtn.add([undoBg, undoLabel]);
    undoBtn.setSize(100, 40);
    undoBtn.setInteractive({ useHandCursor: true });

    undoBtn.on('pointerdown', () => {
      this.puzzleManager?.undo();
      this.rebuildTiles();
      this.clearSelection();
      const state = this.puzzleManager?.getState();
      if (state !== undefined) {
        this.hud?.updateOperations(state.operationsRemaining);
      }
      this.updatePalindromeHighlight();
    });

    // Reset button
    const resetBtn = this.add.container(200, GAME_HEIGHT - 40);

    const resetBg = this.add.graphics();
    resetBg.fillStyle(COLORS.primary, 1);
    resetBg.fillRoundedRect(-50, -20, 100, 40, 8);

    const resetLabel = this.add.text(0, 0, '↻ Reset', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    resetLabel.setOrigin(0.5, 0.5);

    resetBtn.add([resetBg, resetLabel]);
    resetBtn.setSize(100, 40);
    resetBtn.setInteractive({ useHandCursor: true });

    resetBtn.on('pointerdown', () => {
      this.puzzleManager?.reset();
      this.rebuildTiles();
      this.clearSelection();
      if (this.levelConfig !== null) {
        this.hud?.updateOperations(this.levelConfig.maxOperations);
        if (this.levelConfig.timeLimit !== null) {
          this.hud?.updateTimer(this.levelConfig.timeLimit);
        }
      }
    });

    // Back to menu button
    const backBtn = this.add.container(GAME_WIDTH - 80, GAME_HEIGHT - 40);

    const backBg = this.add.graphics();
    backBg.fillStyle(COLORS.primary, 1);
    backBg.fillRoundedRect(-60, -20, 120, 40, 8);

    const backLabel = this.add.text(0, 0, '← Menu', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    backLabel.setOrigin(0.5, 0.5);

    backBtn.add([backBg, backLabel]);
    backBtn.setSize(120, 40);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      this.puzzleManager?.destroy();
      this.scene.start('LevelSelectScene');
    });
  }

  private createLevelDescription(): void {
    if (this.levelConfig === null) return;

    const desc = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 80,
      this.levelConfig.description,
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888',
        align: 'center',
        wordWrap: { width: 500 },
      }
    );
    desc.setOrigin(0.5, 0);
  }

  private setupKeyboard(): void {
    // Escape to go back
    this.input.keyboard?.on('keydown-ESC', () => {
      this.clearSelection();
    });

    // Z for undo
    this.input.keyboard?.on('keydown-Z', () => {
      this.puzzleManager?.undo();
      this.rebuildTiles();
      this.clearSelection();
      const state = this.puzzleManager?.getState();
      if (state !== undefined) {
        this.hud?.updateOperations(state.operationsRemaining);
      }
      this.updatePalindromeHighlight();
    });

    // R for reset
    this.input.keyboard?.on('keydown-R', () => {
      this.puzzleManager?.reset();
      this.rebuildTiles();
      this.clearSelection();
      if (this.levelConfig !== null) {
        this.hud?.updateOperations(this.levelConfig.maxOperations);
        if (this.levelConfig.timeLimit !== null) {
          this.hud?.updateTimer(this.levelConfig.timeLimit);
        }
      }
    });

    // Number keys for operation selection
    const ops = this.levelConfig?.allowedOperations ?? [];
    for (let i = 0; i < ops.length && i < 6; i++) {
      const opIndex = i;
      this.input.keyboard?.on(`keydown-${i + 1}`, () => {
        const op = ops[opIndex];
        if (op !== undefined) {
          this.operationPanel?.selectOperation(op);
        }
      });
    }
  }

  shutdown(): void {
    this.puzzleManager?.destroy();
  }
}
