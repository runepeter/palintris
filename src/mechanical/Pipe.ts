import Phaser from 'phaser';
import type { PipeElement, PipeShape, Direction } from '../types';

// Map pipe shapes to sprite numbers (based on Kenney assets)
const PIPE_SPRITE_MAP: Record<PipeShape, string> = {
  'corner_ne': 'pipe_01',     // Corner: connects top and right
  'corner_nw': 'pipe_02',     // Corner: connects top and left
  'corner_se': 'pipe_03',     // Corner: connects bottom and right
  'corner_sw': 'pipe_04',     // Corner: connects bottom and left
  't_north': 'pipe_05',       // T-junction opening up
  't_south': 'pipe_06',       // T-junction opening down
  't_east': 'pipe_07',        // T-junction opening right
  't_west': 'pipe_08',        // T-junction opening left
  'straight_v': 'pipe_09',    // Vertical straight (with fluid indicator)
  'straight_h': 'pipe_10',    // Horizontal straight
  'cross': 'pipe_11',         // 4-way cross
  'end_north': 'pipe_12',     // End cap facing up
  'end_south': 'pipe_13',     // End cap facing down
  'end_east': 'pipe_14',      // End cap facing right
  'end_west': 'pipe_15',      // End cap facing left
};

// Connection points for each pipe shape
const PIPE_CONNECTIONS: Record<PipeShape, Direction[]> = {
  'corner_ne': ['up', 'right'],
  'corner_nw': ['up', 'left'],
  'corner_se': ['down', 'right'],
  'corner_sw': ['down', 'left'],
  't_north': ['up', 'left', 'right'],
  't_south': ['down', 'left', 'right'],
  't_east': ['up', 'down', 'right'],
  't_west': ['up', 'down', 'left'],
  'straight_v': ['up', 'down'],
  'straight_h': ['left', 'right'],
  'cross': ['up', 'down', 'left', 'right'],
  'end_north': ['up'],
  'end_south': ['down'],
  'end_east': ['right'],
  'end_west': ['left'],
};

export class Pipe extends Phaser.GameObjects.Container {
  private config: PipeElement;
  private pipeSprite: Phaser.GameObjects.Image;
  private fluidOverlay: Phaser.GameObjects.Graphics | null = null;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private currentRotation = 0;
  private isAnimating = false;
  private hasActiveFluid = false;

  public onRotate?: (pipe: Pipe) => void;
  public onFluidPass?: (pipe: Pipe, from: Direction, to: Direction) => void;

  constructor(scene: Phaser.Scene, config: PipeElement) {
    super(scene, config.gridX, config.gridY);
    this.config = config;

    // Create glow effect (behind pipe)
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);

    // Create pipe sprite
    const spriteKey = PIPE_SPRITE_MAP[config.shape];
    this.pipeSprite = scene.add.image(0, 0, spriteKey);
    this.pipeSprite.setDisplaySize(64, 64);
    this.add(this.pipeSprite);

    // Create fluid overlay if pipe has fluid
    if (config.hasFluid) {
      this.createFluidOverlay();
    }

    // Make interactive if rotatable
    if (config.rotatable) {
      this.setSize(64, 64);
      this.setInteractive({ useHandCursor: true });
      this.setupInteraction();
    }

    scene.add.existing(this);
  }

  private setupInteraction(): void {
    this.on('pointerover', () => {
      if (!this.isAnimating) {
        this.showHoverEffect();
      }
    });

    this.on('pointerout', () => {
      this.hideHoverEffect();
    });

    this.on('pointerdown', () => {
      if (!this.isAnimating) {
        this.rotatePipe();
      }
    });
  }

  private createFluidOverlay(): void {
    this.fluidOverlay = this.scene.add.graphics();
    this.add(this.fluidOverlay);
    this.updateFluidOverlay();
  }

  private updateFluidOverlay(): void {
    if (this.fluidOverlay === null) return;

    this.fluidOverlay.clear();

    if (this.hasActiveFluid) {
      // Draw fluid flowing through the pipe
      this.fluidOverlay.fillStyle(0x44aaff, 0.6);
      const connections = this.getConnections();

      connections.forEach((dir) => {
        switch (dir) {
          case 'up':
            this.fluidOverlay?.fillRect(-8, -32, 16, 32);
            break;
          case 'down':
            this.fluidOverlay?.fillRect(-8, 0, 16, 32);
            break;
          case 'left':
            this.fluidOverlay?.fillRect(-32, -8, 32, 16);
            break;
          case 'right':
            this.fluidOverlay?.fillRect(0, -8, 32, 16);
            break;
        }
      });

      // Center connection point
      this.fluidOverlay.fillCircle(0, 0, 10);
    }
  }

  private showHoverEffect(): void {
    this.glowGraphics.clear();
    this.glowGraphics.fillStyle(0x44ffaa, 0.3);
    this.glowGraphics.fillRoundedRect(-36, -36, 72, 72, 8);

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      ease: 'Back.easeOut',
    });
  }

  private hideHoverEffect(): void {
    this.glowGraphics.clear();
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
    });
  }

  public rotatePipe(): void {
    if (this.isAnimating || !this.config.rotatable) return;

    this.isAnimating = true;
    this.currentRotation += 90;

    this.scene.tweens.add({
      targets: [this.pipeSprite, this.fluidOverlay].filter(Boolean),
      angle: this.currentRotation,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.isAnimating = false;
        this.updateShapeAfterRotation();

        if (this.onRotate !== undefined) {
          this.onRotate(this);
        }
      },
    });

    // Particle effect
    this.createRotationParticles();
  }

  private updateShapeAfterRotation(): void {
    // The visual rotation changes which directions the pipe connects
    // This is handled by getConnections() using currentRotation
  }

  private createRotationParticles(): void {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const x = Math.cos(angle) * 35;
      const y = Math.sin(angle) * 35;

      let particle: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (this.scene.textures.exists('particle_white_1')) {
        particle = this.scene.add.image(this.x + x, this.y + y, 'particle_white_1');
        particle.setScale(0.2);
      } else {
        particle = this.scene.add.circle(this.x + x, this.y + y, 3, 0x44ffaa);
      }

      this.scene.tweens.add({
        targets: particle,
        x: this.x + x * 1.5,
        y: this.y + y * 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }

  public getConnections(): Direction[] {
    const baseConnections = PIPE_CONNECTIONS[this.config.shape];
    const rotations = Math.floor(((this.currentRotation % 360) + 360) % 360 / 90);

    // Rotate connections based on current rotation
    const directionOrder: Direction[] = ['up', 'right', 'down', 'left'];
    return baseConnections.map((dir) => {
      const index = directionOrder.indexOf(dir);
      const newIndex = (index + rotations) % 4;
      return directionOrder[newIndex] as Direction;
    });
  }

  public setFluidActive(active: boolean): void {
    this.hasActiveFluid = active;
    this.updateFluidOverlay();

    if (active) {
      this.animateFluidFlow();
    }
  }

  private animateFluidFlow(): void {
    if (this.fluidOverlay === null) return;

    // Pulse animation for fluid
    this.scene.tweens.add({
      targets: this.fluidOverlay,
      alpha: { from: 0.4, to: 0.8 },
      duration: 500,
      yoyo: true,
      repeat: 2,
    });
  }

  public passFluid(fromDirection: Direction): Direction | null {
    const connections = this.getConnections();

    // Check if fluid can enter from this direction
    const oppositeDir = this.getOppositeDirection(fromDirection);
    if (!connections.includes(oppositeDir)) {
      return null; // Pipe doesn't connect from this direction
    }

    // Find exit direction (any connected direction except entry)
    const exitDirs = connections.filter((d) => d !== oppositeDir);
    if (exitDirs.length === 0) return null;

    // For now, just take the first exit (more complex logic can be added)
    const exitDir = exitDirs[0];

    // Trigger callback
    if (this.onFluidPass !== undefined && exitDir !== undefined) {
      this.onFluidPass(this, fromDirection, exitDir);
    }

    return exitDir ?? null;
  }

  private getOppositeDirection(dir: Direction): Direction {
    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    return opposites[dir];
  }

  public getConfig(): PipeElement {
    return this.config;
  }

  public setHighlight(enabled: boolean): void {
    if (enabled) {
      this.glowGraphics.clear();
      this.glowGraphics.fillStyle(0x44ff88, 0.4);
      this.glowGraphics.fillRoundedRect(-40, -40, 80, 80, 10);

      this.scene.tweens.add({
        targets: this.glowGraphics,
        alpha: { from: 0.4, to: 0.8 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.killTweensOf(this.glowGraphics);
      this.glowGraphics.clear();
      this.glowGraphics.setAlpha(1);
    }
  }
}
