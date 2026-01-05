import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

// Asset manifest for organized loading
const TILE_COLORS = ['blue', 'red', 'green', 'yellow', 'orange', 'pink', 'grey', 'black'] as const;
const TILE_SHAPES = ['circle', 'triangle', 'square', 'diamond', 'star', 'hexagon', 'heart'] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(COLORS.primary, 0.8);
    progressBox.fillRoundedRect(
      GAME_WIDTH / 2 - 160,
      GAME_HEIGHT / 2 - 25,
      320,
      50,
      10
    );

    const loadingText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 50,
      'Loading...',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff',
      }
    );
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      '0%',
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
      }
    );
    percentText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.accent, 1);
      progressBar.fillRoundedRect(
        GAME_WIDTH / 2 - 150,
        GAME_HEIGHT / 2 - 15,
        300 * value,
        30,
        5
      );
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // Load tile sprites - all color/shape combinations
    for (const color of TILE_COLORS) {
      for (const shape of TILE_SHAPES) {
        const key = `tile_${color}_${shape}`;
        this.load.image(key, `/assets/tiles/${color}_${shape}.png`);
      }
    }

    // Load particles
    this.load.image('particle_white_1', '/assets/particles/particleWhite_1.png');
    this.load.image('particle_white_2', '/assets/particles/particleWhite_2.png');
    this.load.image('particle_white_3', '/assets/particles/particleWhite_3.png');
    this.load.image('particle_white_4', '/assets/particles/particleWhite_4.png');
    this.load.image('particle_white_5', '/assets/particles/particleWhite_5.png');
    this.load.image('particle_white_6', '/assets/particles/particleWhite_6.png');
    this.load.image('particle_white_7', '/assets/particles/particleWhite_7.png');

    this.load.image('particle_blue_1', '/assets/particles/particleBlue_1.png');
    this.load.image('particle_blue_2', '/assets/particles/particleBlue_2.png');
    this.load.image('particle_blue_3', '/assets/particles/particleBlue_3.png');
    this.load.image('particle_blue_4', '/assets/particles/particleBlue_4.png');
    this.load.image('particle_blue_5', '/assets/particles/particleBlue_5.png');
    this.load.image('particle_blue_6', '/assets/particles/particleBlue_6.png');
    this.load.image('particle_blue_7', '/assets/particles/particleBlue_7.png');

    this.load.image('particle_yellow_1', '/assets/particles/particleYellow_1.png');
    this.load.image('particle_yellow_2', '/assets/particles/particleYellow_2.png');
    this.load.image('particle_yellow_3', '/assets/particles/particleYellow_3.png');
    this.load.image('particle_yellow_4', '/assets/particles/particleYellow_4.png');
    this.load.image('particle_yellow_5', '/assets/particles/particleYellow_5.png');
    this.load.image('particle_yellow_6', '/assets/particles/particleYellow_6.png');
    this.load.image('particle_yellow_7', '/assets/particles/particleYellow_7.png');

    // Load coins
    this.load.image('coin_gold', '/assets/coins/coin_gold.png');
    this.load.image('coin_silver', '/assets/coins/coin_silver.png');
    this.load.image('coin_bronze', '/assets/coins/coin_bronze.png');

    // Load UI elements
    this.load.image('tile_bg_yellow', '/assets/ui/tile_bg_yellow.png');
    this.load.image('tile_bg_blue', '/assets/ui/tile_bg_blue.png');
    this.load.image('tile_bg_green', '/assets/ui/tile_bg_green.png');
    this.load.image('tile_bg_red', '/assets/ui/tile_bg_red.png');

    // Load mechanical puzzle assets
    // Pipes (grey) - various shapes for pipe puzzles
    for (let i = 1; i <= 44; i++) {
      const num = i.toString().padStart(2, '0');
      this.load.image(`pipe_${num}`, `/assets/mechanical/pipes/pipeGrey_${num}.png`);
    }

    // Gears/Rotate blocks
    this.load.image('gear_large', '/assets/mechanical/gears/block_rotate_large.png');
    this.load.image('gear_narrow', '/assets/mechanical/gears/block_rotate_narrow.png');

    // Buttons/Switches
    this.load.image('button_blue', '/assets/mechanical/buttons/button_blue.png');
    this.load.image('button_grey', '/assets/mechanical/buttons/button_grey.png');
    this.load.image('button_yellow', '/assets/mechanical/buttons/button_yellow.png');

    // Balls for marble mechanics
    for (let i = 1; i <= 10; i++) {
      const num = i.toString().padStart(2, '0');
      this.load.image(`ball_grey_${num}`, `/assets/mechanical/balls/ballGrey_${num}.png`);
    }

    // Paddles for levers
    for (let i = 1; i <= 12; i++) {
      const num = i.toString().padStart(2, '0');
      this.load.image(`paddle_${num}`, `/assets/mechanical/paddles/paddle_${num}.png`);
    }
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
