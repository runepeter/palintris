import Phaser from 'phaser';
import {
  COLORS,
  GAME_WIDTH,
  GAME_HEIGHT,
  TILE_SIZE,
  TILE_SPACING,
  ANIMATION_DURATION,
} from '../config/gameConfig';
import { getLevelById } from '../config/levels';
import { getSymbolByDisplay } from '../config/symbols';
import { PuzzleManager } from '../game/PuzzleManager';
import { Tile } from '../ui/Tile';
import { isPalindrome } from '../utils/palindrome';
import { audio } from '../utils/audio';
import { ParticleEffects } from '../ui/ParticleEffects';
import type { LevelConfig, OperationType } from '../types';
import { loadGameState, saveGameState } from '../utils/storage';

interface VersusSceneData {
  levelId?: number;
  bestOf?: 3 | 5;
}

interface PlayerState {
  puzzleManager: PuzzleManager;
  tiles: Tile[];
  selectedTileIndex: number | null;
  selectedOperation: OperationType | null;
  sequence: string[];
  moves: number;
  timeElapsed: number;
  completed: boolean;
  particles: ParticleEffects;
  tilesContainer: Phaser.GameObjects.Container;
  movesText: Phaser.GameObjects.Text;
  timeText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
}

export class VersusScene extends Phaser.Scene {
  private levelConfig: LevelConfig | null = null;
  private player1: PlayerState | null = null;
  private player2: PlayerState | null = null;
  private winner: 1 | 2 | null = null;
  private startTime = 0;
  private gameActive = false;
  private bestOf: 3 | 5 = 3;
  private player1Wins = 0;
  private player2Wins = 0;
  private roundNumber = 1;

  constructor() {
    super({ key: 'VersusScene' });
  }

  init(data: VersusSceneData): void {
    // Use a random level or specific level
    const levelId = data.levelId ?? (Math.floor(Math.random() * 10) + 1);
    const level = getLevelById(levelId);

    if (level === undefined) {
      this.scene.start('MenuScene');
      return;
    }

    this.levelConfig = level;
    this.bestOf = data.bestOf ?? 3;
    this.roundNumber = 1;
    this.player1Wins = 0;
    this.player2Wins = 0;
  }

  create(): void {
    if (this.levelConfig === null) return;

    // Start gameplay music
    audio.startMusic('gameplay');

    // Reset state
    this.winner = null;
    this.gameActive = true;
    this.startTime = Date.now();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.backgroundGradientStart, COLORS.backgroundGradientStart,
                         COLORS.backgroundGradientEnd, COLORS.backgroundGradientEnd, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title with round info
    const titleText = this.add.text(GAME_WIDTH / 2, 30, 'VERSUS MODE', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '32px',
      color: '#ffffff',
      stroke: '#ff00ff',
      strokeThickness: 2,
    });
    titleText.setOrigin(0.5, 0.5);

    // Best of indicator
    const roundText = this.add.text(GAME_WIDTH / 2, 65, `Round ${this.roundNumber} - Best of ${this.bestOf}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaacc',
    });
    roundText.setOrigin(0.5, 0.5);

    // Score display
    this.createScoreDisplay();

    // Vertical divider
    const divider = this.add.graphics();
    divider.lineStyle(2, COLORS.ui.panelBorder, 0.5);
    divider.lineBetween(GAME_WIDTH / 2, 90, GAME_WIDTH / 2, GAME_HEIGHT - 80);

    // Create both players
    this.createPlayer1();
    this.createPlayer2();

    // Level description
    this.createLevelDescription();

    // Setup input
    this.setupPlayer1Input();
    this.setupPlayer2Input();

    // Back button
    this.createBackButton();

    // Update timer
    this.time.addEvent({
      delay: 100,
      callback: () => this.updateTimers(),
      loop: true,
    });
  }

  private createPlayer1(): void {
    if (this.levelConfig === null) return;

    const particles = new ParticleEffects(this);
    const puzzleManager = new PuzzleManager(this.levelConfig);

    // Player 1 container (left side)
    const containerX = GAME_WIDTH / 4;
    const containerY = GAME_HEIGHT / 2 + 20;

    const tilesContainer = this.add.container(containerX, containerY);
    const tiles = this.createTilesForPlayer(puzzleManager, tilesContainer);

    // Player 1 label
    const label = this.add.text(containerX, 100, 'PLAYER 1', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '20px',
      color: '#00ffff',
    });
    label.setOrigin(0.5, 0.5);

    // Controls hint
    const controls = this.add.text(containerX, 125, 'A/D: Select | W/S: Operation | SPACE: Confirm', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#666677',
    });
    controls.setOrigin(0.5, 0.5);

    // Stats
    const movesText = this.add.text(containerX - 80, containerY + 120, 'Moves: 0', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });

    const timeText = this.add.text(containerX + 20, containerY + 120, 'Time: 0:00', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });

    const statusText = this.add.text(containerX, containerY + 145, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffaa00',
    });
    statusText.setOrigin(0.5, 0.5);

    this.player1 = {
      puzzleManager,
      tiles,
      selectedTileIndex: null,
      selectedOperation: this.levelConfig.allowedOperations[0] ?? null,
      sequence: puzzleManager.getSequence(),
      moves: 0,
      timeElapsed: 0,
      completed: false,
      particles,
      tilesContainer,
      movesText,
      timeText,
      statusText,
    };

    // Show selected operation
    this.updateOperationDisplay(1);
  }

  private createPlayer2(): void {
    if (this.levelConfig === null) return;

    const particles = new ParticleEffects(this);
    const puzzleManager = new PuzzleManager(this.levelConfig);

    // Player 2 container (right side)
    const containerX = (GAME_WIDTH / 4) * 3;
    const containerY = GAME_HEIGHT / 2 + 20;

    const tilesContainer = this.add.container(containerX, containerY);
    const tiles = this.createTilesForPlayer(puzzleManager, tilesContainer);

    // Player 2 label
    const label = this.add.text(containerX, 100, 'PLAYER 2', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '20px',
      color: '#ff00ff',
    });
    label.setOrigin(0.5, 0.5);

    // Controls hint
    const controls = this.add.text(containerX, 125, 'ARROWS: Select | UP/DOWN: Operation | ENTER: Confirm', {
      fontFamily: 'Arial',
      fontSize: '10px',
      color: '#666677',
    });
    controls.setOrigin(0.5, 0.5);

    // Stats
    const movesText = this.add.text(containerX - 80, containerY + 120, 'Moves: 0', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });

    const timeText = this.add.text(containerX + 20, containerY + 120, 'Time: 0:00', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });

    const statusText = this.add.text(containerX, containerY + 145, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffaa00',
    });
    statusText.setOrigin(0.5, 0.5);

    this.player2 = {
      puzzleManager,
      tiles,
      selectedTileIndex: null,
      selectedOperation: this.levelConfig.allowedOperations[0] ?? null,
      sequence: puzzleManager.getSequence(),
      moves: 0,
      timeElapsed: 0,
      completed: false,
      particles,
      tilesContainer,
      movesText,
      timeText,
      statusText,
    };

    // Show selected operation
    this.updateOperationDisplay(2);
  }

  private createTilesForPlayer(puzzleManager: PuzzleManager, container: Phaser.GameObjects.Container): Tile[] {
    const sequence = puzzleManager.getSequence();
    const tiles: Tile[] = [];
    const totalWidth = sequence.length * (TILE_SIZE + TILE_SPACING) - TILE_SPACING;
    const startX = -totalWidth / 2;

    sequence.forEach((symbolDisplay, index) => {
      const symbol = getSymbolByDisplay(symbolDisplay);
      if (symbol === undefined) return;

      const x = startX + index * (TILE_SIZE + TILE_SPACING) + TILE_SIZE / 2;
      const tile = new Tile(this, x, 0, symbol, index);
      container.add(tile);
      tiles.push(tile);
    });

    return tiles;
  }

  private setupPlayer1Input(): void {
    // Player 1: WASD + Space
    const keyA = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyD = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyW = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    const keyS = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    const keySpace = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    keyA?.on('down', () => this.moveSelection(1, -1));
    keyD?.on('down', () => this.moveSelection(1, 1));
    keyW?.on('down', () => this.cycleOperation(1, -1));
    keyS?.on('down', () => this.cycleOperation(1, 1));
    keySpace?.on('down', () => this.confirmAction(1));
  }

  private setupPlayer2Input(): void {
    // Player 2: Arrow keys + Enter
    const keyLeft = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    const keyRight = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    const keyUp = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    const keyDown = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    const keyEnter = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    keyLeft?.on('down', () => this.moveSelection(2, -1));
    keyRight?.on('down', () => this.moveSelection(2, 1));
    keyUp?.on('down', () => this.cycleOperation(2, -1));
    keyDown?.on('down', () => this.cycleOperation(2, 1));
    keyEnter?.on('down', () => this.confirmAction(2));
  }

  private moveSelection(player: 1 | 2, delta: number): void {
    if (!this.gameActive || this.winner !== null) return;

    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null || playerState.completed) return;

    const currentIndex = playerState.selectedTileIndex ?? 0;
    const newIndex = Math.max(0, Math.min(playerState.tiles.length - 1, currentIndex + delta));

    // Deselect old tile
    if (playerState.selectedTileIndex !== null) {
      playerState.tiles[playerState.selectedTileIndex]?.deselect();
    }

    // Select new tile
    playerState.selectedTileIndex = newIndex;
    playerState.tiles[newIndex]?.select();

    audio.playClick();
  }

  private cycleOperation(player: 1 | 2, delta: number): void {
    if (!this.gameActive || this.winner !== null || this.levelConfig === null) return;

    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null || playerState.completed) return;

    const operations = this.levelConfig.allowedOperations;
    const currentIndex = playerState.selectedOperation !== null
      ? operations.indexOf(playerState.selectedOperation)
      : 0;

    const newIndex = (currentIndex + delta + operations.length) % operations.length;
    playerState.selectedOperation = operations[newIndex] ?? null;

    this.updateOperationDisplay(player);
    audio.playClick();
  }

  private updateOperationDisplay(player: 1 | 2): void {
    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null) return;

    const opName = playerState.selectedOperation?.toUpperCase() ?? 'NONE';
    playerState.statusText.setText(`Operation: ${opName}`);
  }

  private confirmAction(player: 1 | 2): void {
    if (!this.gameActive || this.winner !== null) return;

    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null || playerState.completed) return;
    if (playerState.selectedTileIndex === null || playerState.selectedOperation === null) return;

    // Apply operation based on type
    const success = this.applyOperation(player);

    if (success) {
      playerState.moves++;
      playerState.movesText.setText(`Moves: ${playerState.moves}`);

      // Update tiles
      this.updatePlayerTiles(player);

      // Check for completion
      this.checkCompletion(player);

      audio.playSuccess();
    } else {
      audio.playError();
    }
  }

  private applyOperation(player: 1 | 2): boolean {
    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null || playerState.selectedTileIndex === null || playerState.selectedOperation === null) {
      return false;
    }

    const position = playerState.selectedTileIndex;
    const operation = playerState.selectedOperation;

    try {
      // Simple swap operation (swap with next tile)
      if (operation === 'swap' && position < playerState.sequence.length - 1) {
        playerState.puzzleManager.applyOperation(operation, position, { targetPosition: position + 1 });
        playerState.sequence = playerState.puzzleManager.getSequence();
        return true;
      }

      // Rotate operation (rotate entire sequence)
      if (operation === 'rotate') {
        playerState.puzzleManager.applyOperation(operation, position);
        playerState.sequence = playerState.puzzleManager.getSequence();
        return true;
      }

      // Mirror operation
      if (operation === 'mirror') {
        playerState.puzzleManager.applyOperation(operation, position);
        playerState.sequence = playerState.puzzleManager.getSequence();
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private updatePlayerTiles(player: 1 | 2): void {
    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null) return;

    playerState.sequence.forEach((symbolDisplay, index) => {
      const symbol = getSymbolByDisplay(symbolDisplay);
      if (symbol !== undefined && playerState.tiles[index] !== undefined) {
        playerState.tiles[index]?.setSymbol(symbol);
      }
    });
  }

  private checkCompletion(player: 1 | 2): void {
    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null) return;

    if (isPalindrome(playerState.sequence)) {
      playerState.completed = true;
      this.winner = player;
      this.gameActive = false;

      // Victory celebration
      this.celebrateVictory(player);

      // Update wins
      if (player === 1) {
        this.player1Wins++;
      } else {
        this.player2Wins++;
      }

      // Show results after delay
      this.time.delayedCall(2000, () => {
        this.showRoundResults();
      });
    }
  }

  private celebrateVictory(player: 1 | 2): void {
    const playerState = player === 1 ? this.player1 : this.player2;
    if (playerState === null) return;

    // Particle burst
    const containerX = player === 1 ? GAME_WIDTH / 4 : (GAME_WIDTH / 4) * 3;
    const containerY = GAME_HEIGHT / 2 + 20;

    playerState.particles.celebrationBurst(containerX, containerY);

    // Flash tiles
    playerState.tiles.forEach((tile, index) => {
      this.tweens.add({
        targets: tile,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: ANIMATION_DURATION.complete,
        yoyo: true,
        delay: index * 50,
      });
    });

    // Victory text
    const victoryText = this.add.text(containerX, GAME_HEIGHT / 2 - 60, 'WINNER!', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '36px',
      color: player === 1 ? '#00ffff' : '#ff00ff',
      stroke: '#ffffff',
      strokeThickness: 3,
    });
    victoryText.setOrigin(0.5, 0.5);
    victoryText.setAlpha(0);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
    });

    audio.playSuccess();
  }

  private showRoundResults(): void {
    // Create overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Results panel
    const panelWidth = 500;
    const panelHeight = 400;
    const panelX = GAME_WIDTH / 2 - panelWidth / 2;
    const panelY = GAME_HEIGHT / 2 - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.ui.panel, 1);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);
    panel.lineStyle(4, COLORS.ui.panelBorder, 1);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);

    // Winner announcement
    const winnerText = this.add.text(GAME_WIDTH / 2, panelY + 60,
      `PLAYER ${this.winner} WINS ROUND ${this.roundNumber}!`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: this.winner === 1 ? '#00ffff' : '#ff00ff',
    });
    winnerText.setOrigin(0.5, 0.5);

    // Score display
    const scoreText = this.add.text(GAME_WIDTH / 2, panelY + 120,
      `Score: ${this.player1Wins} - ${this.player2Wins}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    });
    scoreText.setOrigin(0.5, 0.5);

    // Check if match is over
    const winsNeeded = Math.ceil(this.bestOf / 2);
    const matchOver = this.player1Wins >= winsNeeded || this.player2Wins >= winsNeeded;

    if (matchOver) {
      const matchWinner = this.player1Wins >= winsNeeded ? 1 : 2;
      const matchText = this.add.text(GAME_WIDTH / 2, panelY + 170,
        `PLAYER ${matchWinner} WINS THE MATCH!`, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '24px',
        color: matchWinner === 1 ? '#00ffff' : '#ff00ff',
      });
      matchText.setOrigin(0.5, 0.5);

      // Track versus stats
      this.trackVersusStats();
    }

    // Buttons
    const buttonY = panelY + 280;

    if (matchOver) {
      this.createResultButton(GAME_WIDTH / 2 - 120, buttonY, 'NEW MATCH', 0x44cc88, () => {
        this.scene.restart();
      });

      this.createResultButton(GAME_WIDTH / 2 + 120, buttonY, 'MENU', 0xff3366, () => {
        this.scene.start('MenuScene');
      });
    } else {
      this.createResultButton(GAME_WIDTH / 2 - 120, buttonY, 'NEXT ROUND', 0x44cc88, () => {
        this.roundNumber++;
        this.scene.restart({ levelId: this.levelConfig?.id, bestOf: this.bestOf });
      });

      this.createResultButton(GAME_WIDTH / 2 + 120, buttonY, 'QUIT', 0xff3366, () => {
        this.scene.start('MenuScene');
      });
    }
  }

  private createResultButton(
    x: number,
    y: number,
    text: string,
    color: number,
    callback: () => void
  ): void {
    const button = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ui.button, 1);
    bg.fillRoundedRect(-90, -25, 180, 50, 10);
    bg.lineStyle(2, color, 1);
    bg.strokeRoundedRect(-90, -25, 180, 50, 10);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '18px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(180, 50);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(color, 0.3);
      bg.fillRoundedRect(-90, -25, 180, 50, 10);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(-90, -25, 180, 50, 10);
      this.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.ui.button, 1);
      bg.fillRoundedRect(-90, -25, 180, 50, 10);
      bg.lineStyle(2, color, 1);
      bg.strokeRoundedRect(-90, -25, 180, 50, 10);
      this.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
    });

    button.on('pointerdown', () => {
      audio.playClick();
      callback();
    });
  }

  private createScoreDisplay(): void {
    const scoreY = 90;

    // Player 1 wins
    const p1Score = this.add.text(GAME_WIDTH / 4, scoreY, `Wins: ${this.player1Wins}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#00ffff',
    });
    p1Score.setOrigin(0.5, 0.5);

    // Player 2 wins
    const p2Score = this.add.text((GAME_WIDTH / 4) * 3, scoreY, `Wins: ${this.player2Wins}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ff00ff',
    });
    p2Score.setOrigin(0.5, 0.5);
  }

  private createLevelDescription(): void {
    if (this.levelConfig === null) return;

    const desc = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60,
      `${this.levelConfig.name}: ${this.levelConfig.description}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888899',
    });
    desc.setOrigin(0.5, 0.5);
  }

  private createBackButton(): void {
    const button = this.add.container(80, GAME_HEIGHT - 35);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.ui.button, 1);
    bg.fillRoundedRect(-60, -20, 120, 40, 8);
    bg.lineStyle(2, COLORS.ui.panelBorder, 0.8);
    bg.strokeRoundedRect(-60, -20, 120, 40, 8);

    const label = this.add.text(0, 0, 'MENU', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(120, 40);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.ui.buttonHover, 1);
      bg.fillRoundedRect(-60, -20, 120, 40, 8);
      bg.lineStyle(2, COLORS.ui.panelBorder, 1);
      bg.strokeRoundedRect(-60, -20, 120, 40, 8);
    });

    button.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.ui.button, 1);
      bg.fillRoundedRect(-60, -20, 120, 40, 8);
      bg.lineStyle(2, COLORS.ui.panelBorder, 0.8);
      bg.strokeRoundedRect(-60, -20, 120, 40, 8);
    });

    button.on('pointerdown', () => {
      audio.playClick();
      this.scene.start('MenuScene');
    });
  }

  private updateTimers(): void {
    if (!this.gameActive || this.winner !== null) return;

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

    if (this.player1 !== null && !this.player1.completed) {
      this.player1.timeElapsed = elapsed;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.player1.timeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }

    if (this.player2 !== null && !this.player2.completed) {
      this.player2.timeElapsed = elapsed;
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      this.player2.timeText.setText(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`);
    }
  }

  private trackVersusStats(): void {
    const gameState = loadGameState();
    const versusGamesPlayed = (gameState as any).versusGamesPlayed ?? 0;
    (gameState as any).versusGamesPlayed = versusGamesPlayed + 1;
    saveGameState(gameState);
  }
}
