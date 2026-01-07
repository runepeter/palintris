import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
} from '../config/gameConfig';
import { getSymbolByDisplay } from '../config/symbols';
import { Tile } from '../ui/Tile';
import { isPalindrome, applyRotate } from '../utils/palindrome';
import { audio } from '../utils/audio';
import { ParticleEffects } from '../ui/ParticleEffects';
import {
  loadGameState,
  saveGameState,
  addScore,
  incrementPalindromesFound,
} from '../utils/storage';

/**
 * CascadeScene - Multiple connected puzzles where solving one affects others
 * Features chain reactions, combo scoring, and strategic gameplay
 */

interface CascadeSequence {
  symbols: string[];
  tiles: Tile[];
  container: Phaser.GameObjects.Container;
  isPalindrome: boolean;
  label: Phaser.GameObjects.Text;
}

export class CascadeScene extends Phaser.Scene {
  private sequences: CascadeSequence[] = [];
  private selectedSequenceIndex: number = 0;
  private selectedTileIndex: number | null = null;
  private totalOperations: number = 0;
  private maxOperations: number = 15;
  private score: number = 0;
  private chainCount: number = 0;
  private maxChain: number = 0;
  private startTime: number = 0;
  private particles: ParticleEffects | null = null;

  // UI elements
  private scoreText: Phaser.GameObjects.Text | null = null;
  private movesText: Phaser.GameObjects.Text | null = null;
  private chainText: Phaser.GameObjects.Text | null = null;
  private highScoreText: Phaser.GameObjects.Text | null = null;

  // Connection arrows
  private arrows: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'CascadeScene' });
  }

  create(): void {
    this.startTime = Date.now();

    // Start gameplay music
    audio.startMusic('gameplay');

    // Reset state
    this.sequences = [];
    this.selectedSequenceIndex = 0;
    this.selectedTileIndex = null;
    this.totalOperations = 0;
    this.score = 0;
    this.chainCount = 0;
    this.maxChain = 0;
    this.arrows = [];

    // Create particle effects
    this.particles = new ParticleEffects(this);
    this.particles.createBackgroundParticles();

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      COLORS.backgroundGradientStart,
      COLORS.backgroundGradientStart,
      COLORS.backgroundGradientEnd,
      COLORS.backgroundGradientEnd,
      1
    );
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 30, 'CASCADE MODE', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#ff00ff',
      strokeThickness: 3,
    });
    title.setOrigin(0.5, 0.5);

    // Create HUD
    this.createHUD();

    // Generate and create sequences
    this.generatePuzzle();
    this.createSequenceDisplays();
    this.drawConnectionArrows();

    // Create control buttons
    this.createControls();

    // Keyboard shortcuts
    this.setupKeyboard();

    // Instructions
    this.createInstructions();
  }

  private createHUD(): void {
    const hudY = 65;
    const leftX = 40;
    const rightX = GAME_WIDTH - 40;

    // Score
    this.scoreText = this.add.text(leftX, hudY, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#00ff88',
    });

    // Moves
    this.movesText = this.add.text(GAME_WIDTH / 2, hudY, `Moves: 0/${this.maxOperations}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
    });
    this.movesText.setOrigin(0.5, 0);

    // Best chain
    this.chainText = this.add.text(rightX, hudY, 'Best Chain: 0', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffaa00',
    });
    this.chainText.setOrigin(1, 0);

    // High score
    const gameState = loadGameState();
    this.highScoreText = this.add.text(rightX, hudY + 30, `High: ${gameState.cascadeHighScore}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#8899bb',
    });
    this.highScoreText.setOrigin(1, 0);
  }

  private generatePuzzle(): void {
    // Generate 3 sequences with varying difficulty
    // Each sequence has 5-6 symbols

    const seq1Symbols = this.generateSequenceSymbols(['A', 'B', 'C', 'D', 'E'], 5);
    const seq2Symbols = this.generateSequenceSymbols(['1', '2', '3', '4', '5', '6'], 6);
    const seq3Symbols = this.generateSequenceSymbols(['X', 'Y', 'Z'], 5);

    this.sequences = [
      {
        symbols: seq1Symbols,
        tiles: [],
        container: this.add.container(0, 0),
        isPalindrome: false,
        label: this.add.text(0, 0, '', { fontSize: '1px' }),
      },
      {
        symbols: seq2Symbols,
        tiles: [],
        container: this.add.container(0, 0),
        isPalindrome: false,
        label: this.add.text(0, 0, '', { fontSize: '1px' }),
      },
      {
        symbols: seq3Symbols,
        tiles: [],
        container: this.add.container(0, 0),
        isPalindrome: false,
        label: this.add.text(0, 0, '', { fontSize: '1px' }),
      },
    ];

    // Scramble sequences (make sure they're NOT palindromes initially)
    this.sequences.forEach(seq => {
      this.scrambleSequence(seq.symbols);
    });
  }

  private generateSequenceSymbols(availableSymbols: string[], length: number): string[] {
    const result: string[] = [];
    for (let i = 0; i < length; i++) {
      const symbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
      if (symbol !== undefined) {
        result.push(symbol);
      }
    }
    return result;
  }

  private scrambleSequence(symbols: string[]): void {
    // Perform random swaps to scramble
    const swaps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < swaps; i++) {
      const pos = Math.floor(Math.random() * (symbols.length - 1));
      const temp = symbols[pos];
      const next = symbols[pos + 1];
      if (temp !== undefined && next !== undefined) {
        symbols[pos] = next;
        symbols[pos + 1] = temp;
      }
    }
  }

  private createSequenceDisplays(): void {
    const sequenceSpacing = 140;
    const startY = 160;

    this.sequences.forEach((seq, seqIndex) => {
      const sequenceY = startY + seqIndex * sequenceSpacing;

      // Label
      seq.label.destroy();
      seq.label = this.add.text(60, sequenceY - 10, `Sequence ${seqIndex + 1}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        color: seqIndex === this.selectedSequenceIndex ? '#ff00ff' : '#8899bb',
      });

      // Create tiles
      const tileCount = seq.symbols.length;
      const totalWidth = tileCount * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
      const startX = GAME_WIDTH / 2 - totalWidth / 2;

      seq.container.setPosition(startX, sequenceY);
      seq.tiles = [];

      seq.symbols.forEach((symbolStr, index) => {
        const symbol = getSymbolByDisplay(symbolStr);
        if (symbol === undefined) return;
        const x = index * (TILE_SIZE + TILE_SPACING);
        const tile = new Tile(this, x, 0, symbol, index);

        tile.on('pointerdown', () => this.onTileClick(seqIndex, index));
        tile.on('pointerover', () => this.onTileHover(tile));
        tile.on('pointerout', () => this.onTileOut(tile));

        seq.tiles.push(tile);
        seq.container.add(tile);
      });

      // Check palindrome status
      this.updateSequenceStatus(seqIndex);
    });
  }

  private drawConnectionArrows(): void {
    // Clear old arrows
    this.arrows.forEach(arrow => arrow.destroy());
    this.arrows = [];

    const sequenceSpacing = 140;
    const startY = 160;

    for (let i = 0; i < this.sequences.length - 1; i++) {
      const fromY = startY + i * sequenceSpacing + TILE_SIZE / 2 + 15;
      const toY = startY + (i + 1) * sequenceSpacing - 25;
      const x = GAME_WIDTH / 2;

      const arrow = this.add.graphics();
      arrow.lineStyle(3, 0xff00ff, 0.5);

      // Draw curved arrow
      const midY = (fromY + toY) / 2;
      const curve = new Phaser.Curves.CubicBezier(
        new Phaser.Math.Vector2(x, fromY),
        new Phaser.Math.Vector2(x - 30, midY - 10),
        new Phaser.Math.Vector2(x + 30, midY + 10),
        new Phaser.Math.Vector2(x, toY)
      );

      curve.draw(arrow, 32);

      // Arrowhead
      arrow.fillStyle(0xff00ff, 0.5);
      arrow.fillTriangle(
        x, toY,
        x - 8, toY - 12,
        x + 8, toY - 12
      );

      // Label
      const label = this.add.text(x + 40, midY, i === 0 ? 'rotate →' : 'shift →', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ff00ff',
      });
      label.setOrigin(0, 0.5);

      this.arrows.push(arrow);
    }
  }

  private onTileClick(seqIndex: number, tileIndex: number): void {
    // Select this sequence
    this.selectedSequenceIndex = seqIndex;

    // Toggle tile selection for swap operation
    if (this.selectedTileIndex === null) {
      this.selectedTileIndex = tileIndex;
      this.highlightTile(seqIndex, tileIndex, true);
    } else {
      // Perform swap
      if (this.selectedTileIndex !== tileIndex) {
        this.performSwap(seqIndex, this.selectedTileIndex, tileIndex);
      }
      this.clearSelection();
    }

    this.updateSequenceLabels();
  }

  private onTileHover(tile: Tile): void {
    tile.highlight();
  }

  private onTileOut(tile: Tile): void {
    tile.unhighlight();
  }

  private highlightTile(seqIndex: number, tileIndex: number, selected: boolean): void {
    const seq = this.sequences[seqIndex];
    if (seq !== undefined) {
      const tile = seq.tiles[tileIndex];
      if (tile !== undefined) {
        if (selected) {
          tile.select();
        } else {
          tile.deselect();
        }
      }
    }
  }

  private clearSelection(): void {
    this.sequences.forEach(seq => {
      seq.tiles.forEach(tile => tile.deselect());
    });
    this.selectedTileIndex = null;
  }

  private performSwap(seqIndex: number, pos1: number, pos2: number): void {
    const seq = this.sequences[seqIndex];
    if (seq === undefined) return;

    // Swap symbols
    const temp = seq.symbols[pos1];
    const other = seq.symbols[pos2];
    if (temp !== undefined && other !== undefined) {
      seq.symbols[pos1] = other;
      seq.symbols[pos2] = temp;
    }

    // Animate swap
    this.animateSwap(seq, pos1, pos2);

    // Increment operations
    this.totalOperations++;
    this.updateHUD();

    // Play sound
    audio.playSwap();

    // Check for cascades
    this.time.delayedCall(300, () => {
      this.checkCascades(seqIndex);
    });
  }

  private animateSwap(seq: CascadeSequence, pos1: number, pos2: number): void {
    const tile1 = seq.tiles[pos1];
    const tile2 = seq.tiles[pos2];
    if (tile1 === undefined || tile2 === undefined) return;

    const x1 = pos1 * (TILE_SIZE + TILE_SPACING);
    const x2 = pos2 * (TILE_SIZE + TILE_SPACING);

    // Update symbols
    const symbol1 = getSymbolByDisplay(seq.symbols[pos1] ?? '');
    const symbol2 = getSymbolByDisplay(seq.symbols[pos2] ?? '');
    if (symbol1 === undefined || symbol2 === undefined) return;

    this.tweens.add({
      targets: tile1,
      x: x2,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        tile1.setSymbol(symbol2);
      },
    });

    this.tweens.add({
      targets: tile2,
      x: x1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        tile2.setSymbol(symbol1);
      },
    });
  }

  private checkCascades(_triggerIndex: number): void {
    // Check all sequences for palindromes
    const palindromeIndices: number[] = [];

    this.sequences.forEach((seq, index) => {
      const wasPalindrome = seq.isPalindrome;
      const nowPalindrome = isPalindrome(seq.symbols);

      if (nowPalindrome && !wasPalindrome) {
        palindromeIndices.push(index);
        seq.isPalindrome = true;
        this.celebratePalindrome(index);
        incrementPalindromesFound();
      } else if (!nowPalindrome && wasPalindrome) {
        seq.isPalindrome = false;
      }

      this.updateSequenceStatus(index);
    });

    // Calculate chain and score
    if (palindromeIndices.length > 0) {
      this.chainCount = palindromeIndices.length;
      this.maxChain = Math.max(this.maxChain, this.chainCount);

      // Score calculation: base + chain multiplier
      const baseScore = 1000 * palindromeIndices.length;
      const multiplier = palindromeIndices.length; // 1x, 2x, or 3x
      const chainBonus = baseScore * (multiplier - 1);
      const totalPoints = baseScore + chainBonus;

      this.score += totalPoints;
      this.updateHUD();

      // Show chain bonus
      if (palindromeIndices.length > 1) {
        this.showChainBonus(palindromeIndices.length, totalPoints);
        audio.playPalindrome();
      } else {
        audio.playSuccess();
      }

      // Apply cascade effects
      this.applyCascadeEffects(palindromeIndices);
    }

    // Check win condition
    this.checkWinCondition();

    // Check lose condition
    if (this.totalOperations >= this.maxOperations) {
      this.checkWinCondition();
    }
  }

  private applyCascadeEffects(palindromeIndices: number[]): void {
    // When Seq1 becomes palindrome → rotate Seq2 by 1
    if (palindromeIndices.includes(0) && this.sequences[1] !== undefined) {
      this.time.delayedCall(600, () => {
        this.cascadeRotate(1);
      });
    }

    // When Seq2 becomes palindrome → shift Seq3 by 1
    if (palindromeIndices.includes(1) && this.sequences[2] !== undefined) {
      this.time.delayedCall(900, () => {
        this.cascadeShift(2);
      });
    }
  }

  private cascadeRotate(seqIndex: number): void {
    const seq = this.sequences[seqIndex];
    if (seq === undefined) return;

    // Rotate sequence to the right
    const rotated = applyRotate(seq.symbols, 0, seq.symbols.length - 1, 'right');
    seq.symbols = rotated;

    // Animate
    this.animateSequenceChange(seq, 'rotate');
    audio.playRotate();

    // Recheck this sequence
    this.time.delayedCall(400, () => {
      this.checkCascades(seqIndex);
    });
  }

  private cascadeShift(seqIndex: number): void {
    const seq = this.sequences[seqIndex];
    if (seq === undefined) return;

    // Shift sequence to the left
    const rotated = applyRotate(seq.symbols, 0, seq.symbols.length - 1, 'left');
    seq.symbols = rotated;

    // Animate
    this.animateSequenceChange(seq, 'shift');
    audio.playRotate();

    // Recheck this sequence
    this.time.delayedCall(400, () => {
      this.checkCascades(seqIndex);
    });
  }

  private animateSequenceChange(seq: CascadeSequence, _type: 'rotate' | 'shift'): void {
    // Update all tiles in sequence with new symbols
    seq.tiles.forEach((tile, index) => {
      const symbol = getSymbolByDisplay(seq.symbols[index] ?? '');
      if (symbol === undefined) return;

      // Flash and update
      this.tweens.add({
        targets: tile,
        scaleX: 0.8,
        scaleY: 0.8,
        duration: 100,
        yoyo: true,
        onStart: () => {
          tile.setAlpha(0.5);
        },
        onComplete: () => {
          tile.setSymbol(symbol);
          tile.setAlpha(1);
        },
      });
    });
  }

  private celebratePalindrome(seqIndex: number): void {
    const seq = this.sequences[seqIndex];
    if (seq === undefined) return;

    // Highlight all tiles
    seq.tiles.forEach(tile => {
      tile.showPalindromeHighlight();

      // Particle burst
      if (this.particles !== null) {
        const worldPos = tile.getWorldTransformMatrix();
        this.particles.sparkle(worldPos.tx, worldPos.ty, 8);
      }
    });

    // Bounce animation
    this.tweens.add({
      targets: seq.container,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private showChainBonus(chainLength: number, points: number): void {
    const text = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      `${chainLength}x CHAIN!\n+${points}`,
      {
        fontFamily: 'Arial Black, Arial',
        fontSize: chainLength === 3 ? '48px' : '36px',
        fontStyle: 'bold',
        color: '#ffff00',
        stroke: '#ff00ff',
        strokeThickness: 4,
        align: 'center',
      }
    );
    text.setOrigin(0.5, 0.5);

    // Animate
    text.setScale(0);
    this.tweens.add({
      targets: text,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0,
      y: text.y - 80,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });

    // Big celebration for 3-chain
    if (chainLength === 3 && this.particles !== null) {
      this.particles.confettiExplosion(GAME_WIDTH / 2, GAME_HEIGHT / 2, 100);
      this.cameras.main.shake(300, 0.005);
    }
  }

  private updateSequenceStatus(seqIndex: number): void {
    const seq = this.sequences[seqIndex];
    if (seq === undefined) return;

    const isPalin = isPalindrome(seq.symbols);
    seq.isPalindrome = isPalin;

    // Update label color
    seq.label.setColor(isPalin ? '#00ff88' : '#8899bb');

    if (isPalin) {
      seq.label.setText(`Sequence ${seqIndex + 1} ✓`);
    } else {
      seq.label.setText(`Sequence ${seqIndex + 1}`);
    }
  }

  private updateSequenceLabels(): void {
    this.sequences.forEach((seq, index) => {
      const isSelected = index === this.selectedSequenceIndex;
      const isPalin = seq.isPalindrome;

      seq.label.setColor(
        isPalin ? '#00ff88' : isSelected ? '#ff00ff' : '#8899bb'
      );
    });
  }

  private checkWinCondition(): void {
    const allPalindromes = this.sequences.every(seq => seq.isPalindrome);

    if (allPalindromes) {
      this.onWin();
    } else if (this.totalOperations >= this.maxOperations) {
      this.onLose();
    }
  }

  private onWin(): void {
    // Calculate bonuses
    const timeBonus = this.calculateTimeBonus();
    const moveBonus = this.calculateMoveBonus();
    const finalScore = this.score + timeBonus + moveBonus;

    // Update high score
    const gameState = loadGameState();
    if (finalScore > gameState.cascadeHighScore) {
      gameState.cascadeHighScore = finalScore;
    }
    if (this.maxChain > gameState.cascadeBestChain) {
      gameState.cascadeBestChain = this.maxChain;
    }
    saveGameState(gameState);

    // Add to total score
    addScore(finalScore);

    // Show win screen
    this.showWinScreen(finalScore, timeBonus, moveBonus);

    audio.playVictoryJingle();
  }

  private onLose(): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'OUT OF MOVES!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '48px',
      color: '#ff3366',
    });
    text.setOrigin(0.5, 0.5);

    const scoreText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      `Final Score: ${this.score}`,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffffff',
      }
    );
    scoreText.setOrigin(0.5, 0.5);

    this.createGameOverButtons();
  }

  private showWinScreen(finalScore: number, timeBonus: number, moveBonus: number): void {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'CASCADE COMPLETE!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '48px',
      color: '#00ff88',
    });
    title.setOrigin(0.5, 0.5);

    const breakdown = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 40,
      [
        `Base Score: ${this.score}`,
        `Time Bonus: +${timeBonus}`,
        `Move Bonus: +${moveBonus}`,
        `─────────────────`,
        `Total: ${finalScore}`,
      ],
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
      }
    );
    breakdown.setOrigin(0.5, 0.5);

    this.createGameOverButtons();
  }

  private calculateTimeBonus(): number {
    const elapsed = (Date.now() - this.startTime) / 1000;
    // Fast completion bonus: up to 500 points for under 60 seconds
    if (elapsed < 60) {
      return Math.floor((60 - elapsed) * 10);
    }
    return 0;
  }

  private calculateMoveBonus(): number {
    // Bonus for using fewer moves
    const movesLeft = this.maxOperations - this.totalOperations;
    return movesLeft * 50;
  }

  private createGameOverButtons(): void {
    // Retry button
    const retryBtn = this.add.text(GAME_WIDTH / 2 - 80, GAME_HEIGHT / 2 + 100, 'Retry', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#3a2a5a',
      padding: { x: 20, y: 10 },
    });
    retryBtn.setOrigin(0.5, 0.5);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      audio.playClick();
      this.scene.restart();
    });
    retryBtn.on('pointerover', () => retryBtn.setBackgroundColor('#5a4a7a'));
    retryBtn.on('pointerout', () => retryBtn.setBackgroundColor('#3a2a5a'));

    // Menu button
    const menuBtn = this.add.text(GAME_WIDTH / 2 + 80, GAME_HEIGHT / 2 + 100, 'Menu', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#3a2a5a',
      padding: { x: 20, y: 10 },
    });
    menuBtn.setOrigin(0.5, 0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      audio.playClick();
      this.scene.start('MenuScene');
    });
    menuBtn.on('pointerover', () => menuBtn.setBackgroundColor('#5a4a7a'));
    menuBtn.on('pointerout', () => menuBtn.setBackgroundColor('#3a2a5a'));
  }

  private createControls(): void {
    const btnY = GAME_HEIGHT - 50;

    // Rotate button (for selected sequence)
    const rotateBtn = this.add.text(GAME_WIDTH / 2 - 120, btnY, 'Rotate [R]', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a2a5a',
      padding: { x: 15, y: 8 },
    });
    rotateBtn.setOrigin(0.5, 0.5);
    rotateBtn.setInteractive({ useHandCursor: true });
    rotateBtn.on('pointerdown', () => {
      if (this.totalOperations < this.maxOperations) {
        this.manualRotate();
      }
    });
    rotateBtn.on('pointerover', () => rotateBtn.setBackgroundColor('#5a4a7a'));
    rotateBtn.on('pointerout', () => rotateBtn.setBackgroundColor('#3a2a5a'));

    // Shift button
    const shiftBtn = this.add.text(GAME_WIDTH / 2, btnY, 'Shift [S]', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a2a5a',
      padding: { x: 15, y: 8 },
    });
    shiftBtn.setOrigin(0.5, 0.5);
    shiftBtn.setInteractive({ useHandCursor: true });
    shiftBtn.on('pointerdown', () => {
      if (this.totalOperations < this.maxOperations) {
        this.manualShift();
      }
    });
    shiftBtn.on('pointerover', () => shiftBtn.setBackgroundColor('#5a4a7a'));
    shiftBtn.on('pointerout', () => shiftBtn.setBackgroundColor('#3a2a5a'));

    // Back to menu
    const backBtn = this.add.text(GAME_WIDTH / 2 + 120, btnY, 'Menu [Esc]', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#3a2a5a',
      padding: { x: 15, y: 8 },
    });
    backBtn.setOrigin(0.5, 0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      audio.playClick();
      this.scene.start('MenuScene');
    });
    backBtn.on('pointerover', () => backBtn.setBackgroundColor('#5a4a7a'));
    backBtn.on('pointerout', () => backBtn.setBackgroundColor('#3a2a5a'));
  }

  private manualRotate(): void {
    const seq = this.sequences[this.selectedSequenceIndex];
    if (seq === undefined) return;

    this.totalOperations++;
    this.clearSelection();

    const rotated = applyRotate(seq.symbols, 0, seq.symbols.length - 1, 'right');
    seq.symbols = rotated;

    this.animateSequenceChange(seq, 'rotate');
    this.updateHUD();
    audio.playRotate();

    this.time.delayedCall(300, () => {
      this.checkCascades(this.selectedSequenceIndex);
    });
  }

  private manualShift(): void {
    const seq = this.sequences[this.selectedSequenceIndex];
    if (seq === undefined) return;

    this.totalOperations++;
    this.clearSelection();

    const shifted = applyRotate(seq.symbols, 0, seq.symbols.length - 1, 'left');
    seq.symbols = shifted;

    this.animateSequenceChange(seq, 'shift');
    this.updateHUD();
    audio.playRotate();

    this.time.delayedCall(300, () => {
      this.checkCascades(this.selectedSequenceIndex);
    });
  }

  private updateHUD(): void {
    if (this.scoreText !== null) {
      this.scoreText.setText(`Score: ${this.score}`);
    }
    if (this.movesText !== null) {
      this.movesText.setText(`Moves: ${this.totalOperations}/${this.maxOperations}`);

      // Warning color when running out of moves
      if (this.totalOperations >= this.maxOperations - 3) {
        this.movesText.setColor('#ff3366');
      } else {
        this.movesText.setColor('#ffffff');
      }
    }
    if (this.chainText !== null) {
      this.chainText.setText(`Best Chain: ${this.maxChain}`);
    }
  }

  private setupKeyboard(): void {
    if (this.input.keyboard === null) return;

    // Number keys to select sequence
    this.input.keyboard.on('keydown-ONE', () => {
      this.selectedSequenceIndex = 0;
      this.clearSelection();
      this.updateSequenceLabels();
    });
    this.input.keyboard.on('keydown-TWO', () => {
      this.selectedSequenceIndex = 1;
      this.clearSelection();
      this.updateSequenceLabels();
    });
    this.input.keyboard.on('keydown-THREE', () => {
      this.selectedSequenceIndex = 2;
      this.clearSelection();
      this.updateSequenceLabels();
    });

    // R for rotate
    this.input.keyboard.on('keydown-R', () => {
      if (this.totalOperations < this.maxOperations) {
        this.manualRotate();
      }
    });

    // S for shift
    this.input.keyboard.on('keydown-S', () => {
      if (this.totalOperations < this.maxOperations) {
        this.manualShift();
      }
    });

    // ESC to go back
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private createInstructions(): void {
    const instructions = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 85,
      'Click tiles to swap • Solve all sequences to win • Making palindromes triggers cascades!',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#8899bb',
        align: 'center',
      }
    );
    instructions.setOrigin(0.5, 0.5);
  }
}
