import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export class TutorialScene extends Phaser.Scene {
  private currentPage = 0;
  private pages: Array<{ title: string; content: string[]; example?: string }> = [];
  private pageContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'TutorialScene' });

    this.pages = [
      {
        title: 'Welcome to Palintris!',
        content: [
          'Palintris is a puzzle game about palindromes.',
          '',
          'A palindrome is a sequence that reads the same',
          'forwards and backwards.',
          '',
          'Examples: ABCBA, 12321, RACECAR',
        ],
        example: 'A B C B A',
      },
      {
        title: 'The Goal',
        content: [
          'Your goal is to transform a sequence',
          'into a palindrome using limited operations.',
          '',
          'Each level gives you a starting sequence',
          'and a set number of moves.',
          '',
          'Think carefully before each move!',
        ],
      },
      {
        title: 'Swap Operation',
        content: [
          'SWAP exchanges two adjacent symbols.',
          '',
          'Click one tile, then click an adjacent tile',
          'to swap them.',
          '',
          'This is the most basic operation.',
        ],
        example: 'AB → BA',
      },
      {
        title: 'Rotate Operation',
        content: [
          'ROTATE shifts a section of tiles.',
          '',
          'Select the start and end of a range,',
          'and all tiles in between will rotate.',
          '',
          'Example: ABC → CAB (rotate right)',
        ],
        example: 'A B C → C A B',
      },
      {
        title: 'Mirror Operation',
        content: [
          'MIRROR reverses a section of tiles.',
          '',
          'Select a range and the tiles will be',
          'flipped in place.',
          '',
          'Example: ABCD → DCBA',
        ],
        example: 'A B C D → D C B A',
      },
      {
        title: 'Advanced Operations',
        content: [
          'INSERT: Add a new symbol',
          'DELETE: Remove a symbol',
          'REPLACE: Change a symbol',
          '',
          'These unlock in harder levels',
          'and help solve complex puzzles.',
        ],
      },
      {
        title: 'Tips for Success',
        content: [
          '• Start from the ends and work inward',
          '• Look for patterns in the sequence',
          '• Use Undo (Z) to try different approaches',
          '• Complete levels quickly for bonus points',
          '• Some levels have specific target palindromes',
        ],
      },
      {
        title: 'Ready to Play?',
        content: [
          'You now know the basics!',
          '',
          'Start with the Tutorial levels',
          'to practice each operation.',
          '',
          'Good luck, palindrome master!',
        ],
      },
    ];
  }

  create(): void {
    // Title
    const title = this.add.text(GAME_WIDTH / 2, 50, 'How to Play', {
      fontFamily: 'Arial',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    title.setOrigin(0.5, 0.5);

    // Back button
    this.createBackButton();

    // Page container
    this.pageContainer = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);
    this.renderPage();

    // Navigation
    this.createNavigation();
  }

  private renderPage(): void {
    if (this.pageContainer === null) return;
    this.pageContainer.removeAll(true);

    const page = this.pages[this.currentPage];
    if (page === undefined) return;

    // Page title
    const pageTitle = this.add.text(0, -180, page.title, {
      fontFamily: 'Arial',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff',
    });
    pageTitle.setOrigin(0.5, 0.5);
    this.pageContainer.add(pageTitle);

    // Content
    let yOffset = -120;
    for (const line of page.content) {
      const text = this.add.text(0, yOffset, line, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#cccccc',
        align: 'center',
      });
      text.setOrigin(0.5, 0.5);
      this.pageContainer.add(text);
      yOffset += 30;
    }

    // Example if present
    if (page.example !== undefined) {
      const exampleBg = this.add.graphics();
      exampleBg.fillStyle(COLORS.secondary, 1);
      exampleBg.fillRoundedRect(-150, yOffset, 300, 50, 10);

      const exampleText = this.add.text(0, yOffset + 25, page.example, {
        fontFamily: 'Courier New',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#00ff88',
      });
      exampleText.setOrigin(0.5, 0.5);

      this.pageContainer.add([exampleBg, exampleText]);
    }

    // Page indicator
    const pageIndicator = this.add.text(
      0,
      180,
      `${this.currentPage + 1} / ${this.pages.length}`,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888',
      }
    );
    pageIndicator.setOrigin(0.5, 0.5);
    this.pageContainer.add(pageIndicator);
  }

  private createBackButton(): void {
    const button = this.add.container(60, 50);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.primary, 1);
    bg.fillRoundedRect(-40, -20, 80, 40, 8);

    const label = this.add.text(0, 0, '← Back', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    label.setOrigin(0.5, 0.5);

    button.add([bg, label]);
    button.setSize(80, 40);
    button.setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private createNavigation(): void {
    // Previous
    const prevBtn = this.add.container(150, GAME_HEIGHT - 60);

    const prevBg = this.add.graphics();
    prevBg.fillStyle(COLORS.primary, 1);
    prevBg.fillRoundedRect(-60, -20, 120, 40, 8);

    const prevLabel = this.add.text(0, 0, '← Previous', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    prevLabel.setOrigin(0.5, 0.5);

    prevBtn.add([prevBg, prevLabel]);
    prevBtn.setSize(120, 40);
    prevBtn.setInteractive({ useHandCursor: true });

    prevBtn.on('pointerdown', () => {
      if (this.currentPage > 0) {
        this.currentPage--;
        this.renderPage();
      }
    });

    // Next
    const nextBtn = this.add.container(GAME_WIDTH - 150, GAME_HEIGHT - 60);

    const nextBg = this.add.graphics();
    nextBg.fillStyle(COLORS.primary, 1);
    nextBg.fillRoundedRect(-60, -20, 120, 40, 8);

    const nextLabel = this.add.text(0, 0, 'Next →', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
    });
    nextLabel.setOrigin(0.5, 0.5);

    nextBtn.add([nextBg, nextLabel]);
    nextBtn.setSize(120, 40);
    nextBtn.setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      if (this.currentPage < this.pages.length - 1) {
        this.currentPage++;
        this.renderPage();
      }
    });

    // Start Playing button (on last page)
    if (this.currentPage === this.pages.length - 1) {
      const startBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 60);

      const startBg = this.add.graphics();
      startBg.fillStyle(COLORS.success, 1);
      startBg.fillRoundedRect(-80, -25, 160, 50, 10);

      const startLabel = this.add.text(0, 0, 'Start Playing!', {
        fontFamily: 'Arial',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      });
      startLabel.setOrigin(0.5, 0.5);

      startBtn.add([startBg, startLabel]);
      startBtn.setSize(160, 50);
      startBtn.setInteractive({ useHandCursor: true });

      startBtn.on('pointerdown', () => {
        this.scene.start('LevelSelectScene');
      });
    }
  }
}
