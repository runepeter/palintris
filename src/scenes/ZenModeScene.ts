import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
} from '../config/gameConfig';
import { getRandomSymbols } from '../config/symbols';
import type { Symbol } from '../types';
import { Tile } from '../ui/Tile';
import { OperationPanel } from '../ui/OperationPanel';
import { audio } from '../utils/audio';
import { ParticleEffects } from '../ui/ParticleEffects';
import {
  isPalindrome,
  generateNonPalindrome,
  minOperationsToMakePalindrome,
  applySwap,
  applyRotate,
  applyMirror,
} from '../utils/palindrome';
import {
  loadGameState,
  saveGameState,
  type ExtendedGameState,
} from '../utils/storage';

// Zen colors - softer, more muted versions
const ZEN_COLORS = {
  background: 0x1a1a2e,
  backgroundLight: 0x252538,
  primary: 0x2d2d44,
  accent: 0x88aacc,
  accentLight: 0xaaccee,
  text: 0xe8e8f0,
  textMuted: 0x999ab8,
  success: 0x88cc88,
  tile: {
    default: 0x35354a,
    selected: 0x88aacc,
    highlight: 0x6688aa,
    palindrome: 0x88cc88,
  },
};

// Difficulty settings for random puzzle generation
interface ZenDifficulty {
  name: string;
  sequenceLength: number;
  symbolCount: number;
  minOperations: number;
  maxOperations: number;
  color: number;
}

const ZEN_DIFFICULTIES: ZenDifficulty[] = [
  {
    name: 'Peaceful',
    sequenceLength: 4,
    symbolCount: 3,
    minOperations: 1,
    maxOperations: 2,
    color: 0x88cc88,
  },
  {
    name: 'Calm',
    sequenceLength: 5,
    symbolCount: 4,
    minOperations: 2,
    maxOperations: 3,
    color: 0x88aacc,
  },
  {
    name: 'Tranquil',
    sequenceLength: 6,
    symbolCount: 4,
    minOperations: 2,
    maxOperations: 4,
    color: 0xaaccee,
  },
  {
    name: 'Serene',
    sequenceLength: 7,
    symbolCount: 5,
    minOperations: 3,
    maxOperations: 5,
    color: 0xcc88aa,
  },
  {
    name: 'Meditative',
    sequenceLength: 8,
    symbolCount: 5,
    minOperations: 3,
    maxOperations: 6,
    color: 0xccaa88,
  },
];

export class ZenModeScene extends Phaser.Scene {
  private currentSequence: string[] = [];
  private availableSymbols: Symbol[] = [];
  private tiles: Tile[] = [];
  private selectedTileIndex: number | null = null;
  private operationPanel: OperationPanel | null = null;
  private isAnimating = false;
  private tilesContainer: Phaser.GameObjects.Container | null = null;
  private particles: ParticleEffects | null = null;
  private movesUsed = 0;
  private par = 0;
  private puzzlesSolved = 0;
  private currentDifficulty: ZenDifficulty;

  // UI elements
  private movesText: Phaser.GameObjects.Text | null = null;
  private parText: Phaser.GameObjects.Text | null = null;
  private difficultyText: Phaser.GameObjects.Text | null = null;
  private puzzleCountText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'ZenModeScene' });
    this.currentDifficulty = ZEN_DIFFICULTIES[0]!;
  }

  create(): void {
    // Start ambient music
    audio.startMusic('menu'); // Use menu music for calm atmosphere

    // Reset state
    this.tiles = [];
    this.selectedTileIndex = null;
    this.isAnimating = false;
    this.movesUsed = 0;
    this.puzzlesSolved = 0;

    // Create particle effects
    this.particles = new ParticleEffects(this);

    // Create ambient background
    this.createAmbientBackground();

    // Title
    const title = this.add.text(GAME_WIDTH / 2, 40, 'ZEN MODE', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#aaccee',
    });
    title.setOrigin(0.5, 0.5);

    // Subtitle
    const subtitle = this.add.text(
      GAME_WIDTH / 2,
      75,
      'No pressure. Just breathe.',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#999ab8',
        fontStyle: 'italic',
      }
    );
    subtitle.setOrigin(0.5, 0.5);

    // Create stats display
    this.createStatsDisplay();

    // Create tiles container
    this.tilesContainer = this.add.container(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 20
    );

    // Generate first puzzle
    this.generateNewPuzzle();

    // Create operation panel with all operations
    this.operationPanel = new OperationPanel(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 120,
      ['swap', 'rotate', 'mirror']
    );

    // Default select swap
    this.operationPanel.selectOperation('swap');

    // Create action buttons
    this.createActionButtons();

    // Keyboard shortcuts
    this.setupKeyboard();

    // Gentle background particles
    this.particles.createBackgroundParticles();

    // Gentle pulse animation on title
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createAmbientBackground(): void {
    // Soft gradient background
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
      ZEN_COLORS.background,
      ZEN_COLORS.background,
      ZEN_COLORS.backgroundLight,
      ZEN_COLORS.backgroundLight,
      1
    );
    gradient.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Soft floating orbs
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const radius = 20 + Math.random() * 40;

      const orb = this.add.graphics();
      orb.fillStyle(ZEN_COLORS.accent, 0.05);
      orb.fillCircle(0, 0, radius);
      orb.setPosition(x, y);

      // Slow floating animation
      this.tweens.add({
        targets: orb,
        x: x + (Math.random() - 0.5) * 100,
        y: y + (Math.random() - 0.5) * 100,
        alpha: 0.02 + Math.random() * 0.03,
        duration: 8000 + Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createStatsDisplay(): void {
    const statY = 115;
    const leftX = 100;
    const rightX = GAME_WIDTH - 100;

    // Left side - Moves
    const movesLabel = this.add.text(leftX, statY, 'Moves:', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#999ab8',
    });
    movesLabel.setOrigin(0.5, 0.5);

    this.movesText = this.add.text(leftX, statY + 25, '0', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#aaccee',
    });
    this.movesText.setOrigin(0.5, 0.5);

    // Par indicator
    this.parText = this.add.text(leftX, statY + 55, 'Par: 0', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#88cc88',
    });
    this.parText.setOrigin(0.5, 0.5);

    // Right side - Puzzle count
    const puzzleLabel = this.add.text(rightX, statY, 'Solved:', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#999ab8',
    });
    puzzleLabel.setOrigin(0.5, 0.5);

    this.puzzleCountText = this.add.text(rightX, statY + 25, '0', {
      fontFamily: 'Arial',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#88cc88',
    });
    this.puzzleCountText.setOrigin(0.5, 0.5);

    // Difficulty
    this.difficultyText = this.add.text(
      rightX,
      statY + 55,
      'Peaceful',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#88cc88',
      }
    );
    this.difficultyText.setOrigin(0.5, 0.5);
  }

  private generateNewPuzzle(): void {
    // Select random difficulty (weighted towards current level)
    const difficultyIndex = Math.min(
      Math.floor(this.puzzlesSolved / 3),
      ZEN_DIFFICULTIES.length - 1
    );
    const baseDifficulty = ZEN_DIFFICULTIES[difficultyIndex];

    // Sometimes add variation
    const variation = Math.random();
    if (variation < 0.3 && difficultyIndex > 0) {
      this.currentDifficulty = ZEN_DIFFICULTIES[difficultyIndex - 1]!;
    } else if (
      variation > 0.7 &&
      difficultyIndex < ZEN_DIFFICULTIES.length - 1
    ) {
      this.currentDifficulty = ZEN_DIFFICULTIES[difficultyIndex + 1]!;
    } else {
      this.currentDifficulty = baseDifficulty!;
    }

    // Get random symbols for this puzzle
    const symbolCategories = ['letters', 'numbers', 'shapes', 'colors'] as const;
    const randomCategory =
      symbolCategories[Math.floor(Math.random() * symbolCategories.length)]!;
    this.availableSymbols = getRandomSymbols(
      randomCategory,
      this.currentDifficulty.symbolCount
    );

    // Generate a non-palindrome sequence
    const symbolDisplays = this.availableSymbols.map((s) => s.display);
    this.currentSequence = generateNonPalindrome(
      symbolDisplays,
      this.currentDifficulty.sequenceLength
    );

    // Calculate par (minimum moves needed)
    this.par = minOperationsToMakePalindrome(this.currentSequence);

    // Ensure par is within difficulty range
    if (this.par < this.currentDifficulty.minOperations) {
      // Make it harder by swapping more
      for (
        let i = 0;
        i < this.currentDifficulty.minOperations - this.par;
        i++
      ) {
        const pos = Math.floor(Math.random() * (this.currentSequence.length - 1));
        this.currentSequence = applySwap(
          this.currentSequence,
          pos,
          pos + 1
        );
      }
      this.par = minOperationsToMakePalindrome(this.currentSequence);
    }

    // Reset moves
    this.movesUsed = 0;

    // Update UI
    this.updateStatsDisplay();

    // Create tiles
    this.createTiles();
  }

  private createTiles(): void {
    if (this.tilesContainer === null) return;

    // Remove old tiles
    for (const tile of this.tiles) {
      tile.destroy();
    }
    this.tiles = [];

    const totalWidth =
      this.currentSequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = -totalWidth / 2 + TILE_SIZE / 2;

    for (let i = 0; i < this.currentSequence.length; i++) {
      const display = this.currentSequence[i];
      if (display === undefined) continue;

      const symbol =
        this.availableSymbols.find((s) => s.display === display) ??
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

      // Gentle fade-in animation
      tile.setAlpha(0);
      this.tweens.add({
        targets: tile,
        alpha: 1,
        duration: 400,
        delay: i * 50,
        ease: 'Sine.easeOut',
      });
    }

    this.updatePalindromeHighlight();
  }

  private createDefaultSymbol(display: string): Symbol {
    return {
      id: `default_${display}`,
      display,
      category: 'mixed',
      color: ZEN_COLORS.text,
    };
  }

  private updateStatsDisplay(): void {
    if (this.movesText !== null) {
      this.movesText.setText(this.movesUsed.toString());

      // Color based on performance
      if (this.movesUsed < this.par) {
        this.movesText.setColor('#88ff88'); // Under par - green
      } else if (this.movesUsed === this.par) {
        this.movesText.setColor('#88ccaa'); // At par - teal
      } else {
        this.movesText.setColor('#aaccee'); // Over par - blue (no red, no stress)
      }
    }

    if (this.parText !== null) {
      this.parText.setText(`Par: ${this.par}`);
    }

    if (this.puzzleCountText !== null) {
      this.puzzleCountText.setText(this.puzzlesSolved.toString());
    }

    if (this.difficultyText !== null) {
      this.difficultyText.setText(this.currentDifficulty.name);
      this.difficultyText.setColor(`#${this.currentDifficulty.color.toString(16).padStart(6, '0')}`);
    }
  }

  private onTileClick(index: number): void {
    if (
      this.isAnimating ||
      this.operationPanel === null ||
      isPalindrome(this.currentSequence)
    )
      return;

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
      this.selectedTileIndex = index;
      this.tiles[index]?.select();
      this.highlightRangeTiles(index);
    } else {
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
    if (this.isAnimating) return;

    this.isAnimating = true;
    this.movesUsed++;
    audio.playSwap();

    const tile1 = this.tiles[pos1];
    const tile2 = this.tiles[pos2];

    if (tile1 !== undefined && tile2 !== undefined) {
      const x1 = tile1.x;
      const x2 = tile2.x;

      // Gentle swap animation
      tile1.animateSwapTo(x2);
      tile2.animateSwapTo(x1, () => {
        // Swap in array
        this.tiles[pos1] = tile2;
        this.tiles[pos2] = tile1;
        tile1.setIndex(pos2);
        tile2.setIndex(pos1);

        // Update sequence
        this.currentSequence = applySwap(this.currentSequence, pos1, pos2);

        this.isAnimating = false;
        this.clearSelection();
        this.updateAfterOperation();
      });
    }
  }

  private performRotate(start: number, end: number, direction: 'left' | 'right'): void {
    if (this.isAnimating) return;

    this.movesUsed++;
    audio.playRotate();

    this.currentSequence = applyRotate(
      this.currentSequence,
      start,
      end,
      direction
    );

    this.rebuildTiles();
    this.updateAfterOperation();
  }

  private performMirror(start: number, end: number): void {
    if (this.isAnimating) return;

    this.movesUsed++;
    audio.playMirror();

    this.currentSequence = applyMirror(this.currentSequence, start, end);

    this.rebuildTiles();
    this.updateAfterOperation();
  }

  private rebuildTiles(): void {
    if (this.tilesContainer === null) return;

    // Remove old tiles
    for (const tile of this.tiles) {
      tile.destroy();
    }
    this.tiles = [];

    const totalWidth =
      this.currentSequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = -totalWidth / 2 + TILE_SIZE / 2;

    for (let i = 0; i < this.currentSequence.length; i++) {
      const display = this.currentSequence[i];
      if (display === undefined) continue;

      const symbol =
        this.availableSymbols.find((s) => s.display === display) ??
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
    this.updateStatsDisplay();
    this.updatePalindromeHighlight();

    // Check for completion
    if (isPalindrome(this.currentSequence)) {
      this.onPuzzleComplete();
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

  private onPuzzleComplete(): void {
    audio.playSuccess();

    // Increment puzzle count
    this.puzzlesSolved++;

    // Save to storage
    this.saveZenProgress();

    // Gentle celebration particles
    if (this.particles !== null) {
      this.particles.celebrationBurst(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2
      );
    }

    // Show completion message
    this.showCompletionMessage();
  }

  private showCompletionMessage(): void {
    // Determine performance
    let message = '';
    let color = '';

    if (this.movesUsed < this.par) {
      message = `Under Par! (${this.movesUsed}/${this.par})`;
      color = '#88ff88';
    } else if (this.movesUsed === this.par) {
      message = `Par! (${this.movesUsed}/${this.par})`;
      color = '#88ccaa';
    } else {
      message = `Complete! (${this.movesUsed}/${this.par})`;
      color = '#aaccee';
    }

    const completionText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 + 100,
      message,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        fontStyle: 'bold',
        color,
      }
    );
    completionText.setOrigin(0.5, 0.5);
    completionText.setAlpha(0);

    // Fade in
    this.tweens.add({
      targets: completionText,
      alpha: 1,
      duration: 400,
      ease: 'Sine.easeOut',
    });

    // Fade out after 2 seconds
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: completionText,
        alpha: 0,
        duration: 400,
        ease: 'Sine.easeIn',
        onComplete: () => {
          completionText.destroy();
        },
      });
    });

    // Auto-generate next puzzle after a moment
    this.time.delayedCall(2500, () => {
      this.generateNewPuzzle();
    });
  }

  private saveZenProgress(): void {
    const state = loadGameState();
    const newState: ExtendedGameState = {
      ...state,
      zenModePuzzlesSolved: (state.zenModePuzzlesSolved ?? 0) + 1,
      zenModeUnderParCount:
        (state.zenModeUnderParCount ?? 0) + (this.movesUsed < this.par ? 1 : 0),
    };
    saveGameState(newState);
  }

  private createActionButtons(): void {
    // New puzzle button
    const newPuzzleBtn = this.add.container(150, GAME_HEIGHT - 40);

    const newPuzzleBg = this.add.graphics();
    newPuzzleBg.fillStyle(ZEN_COLORS.primary, 1);
    newPuzzleBg.fillRoundedRect(-70, -20, 140, 40, 8);
    newPuzzleBg.lineStyle(2, ZEN_COLORS.accent, 0.5);
    newPuzzleBg.strokeRoundedRect(-70, -20, 140, 40, 8);

    const newPuzzleLabel = this.add.text(0, 0, 'New Puzzle', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaccee',
    });
    newPuzzleLabel.setOrigin(0.5, 0.5);

    newPuzzleBtn.add([newPuzzleBg, newPuzzleLabel]);
    newPuzzleBtn.setSize(140, 40);
    newPuzzleBtn.setInteractive({ useHandCursor: true });

    newPuzzleBtn.on('pointerover', () => {
      newPuzzleBg.clear();
      newPuzzleBg.fillStyle(ZEN_COLORS.accent, 0.3);
      newPuzzleBg.fillRoundedRect(-70, -20, 140, 40, 8);
      newPuzzleBg.lineStyle(2, ZEN_COLORS.accentLight, 0.8);
      newPuzzleBg.strokeRoundedRect(-70, -20, 140, 40, 8);
    });

    newPuzzleBtn.on('pointerout', () => {
      newPuzzleBg.clear();
      newPuzzleBg.fillStyle(ZEN_COLORS.primary, 1);
      newPuzzleBg.fillRoundedRect(-70, -20, 140, 40, 8);
      newPuzzleBg.lineStyle(2, ZEN_COLORS.accent, 0.5);
      newPuzzleBg.strokeRoundedRect(-70, -20, 140, 40, 8);
    });

    newPuzzleBtn.on('pointerdown', () => {
      audio.playClick();
      this.generateNewPuzzle();
    });

    // Back to menu button
    const backBtn = this.add.container(GAME_WIDTH - 100, GAME_HEIGHT - 40);

    const backBg = this.add.graphics();
    backBg.fillStyle(ZEN_COLORS.primary, 1);
    backBg.fillRoundedRect(-60, -20, 120, 40, 8);
    backBg.lineStyle(2, ZEN_COLORS.accent, 0.5);
    backBg.strokeRoundedRect(-60, -20, 120, 40, 8);

    const backLabel = this.add.text(0, 0, 'Menu', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaccee',
    });
    backLabel.setOrigin(0.5, 0.5);

    backBtn.add([backBg, backLabel]);
    backBtn.setSize(120, 40);
    backBtn.setInteractive({ useHandCursor: true });

    backBtn.on('pointerover', () => {
      backBg.clear();
      backBg.fillStyle(ZEN_COLORS.accent, 0.3);
      backBg.fillRoundedRect(-60, -20, 120, 40, 8);
      backBg.lineStyle(2, ZEN_COLORS.accentLight, 0.8);
      backBg.strokeRoundedRect(-60, -20, 120, 40, 8);
    });

    backBtn.on('pointerout', () => {
      backBg.clear();
      backBg.fillStyle(ZEN_COLORS.primary, 1);
      backBg.fillRoundedRect(-60, -20, 120, 40, 8);
      backBg.lineStyle(2, ZEN_COLORS.accent, 0.5);
      backBg.strokeRoundedRect(-60, -20, 120, 40, 8);
    });

    backBtn.on('pointerdown', () => {
      audio.playClick();
      this.scene.start('MenuScene');
    });
  }

  private setupKeyboard(): void {
    // Escape to go back
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.selectedTileIndex === null) {
        this.scene.start('MenuScene');
      } else {
        this.clearSelection();
      }
    });

    // N for new puzzle
    this.input.keyboard?.on('keydown-N', () => {
      this.generateNewPuzzle();
    });

    // Number keys for operation selection
    this.input.keyboard?.on('keydown-ONE', () => {
      this.operationPanel?.selectOperation('swap');
    });

    this.input.keyboard?.on('keydown-TWO', () => {
      this.operationPanel?.selectOperation('rotate');
    });

    this.input.keyboard?.on('keydown-THREE', () => {
      this.operationPanel?.selectOperation('mirror');
    });
  }
}
