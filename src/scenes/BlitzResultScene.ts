import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, SPACE } from '../theme/theme';
import { makeButton, makeLabel, SCENE } from './ui';

interface BlitzResultData {
  readonly solved: number;
  readonly best: number;
  readonly isNewBest: boolean;
}

const BUTTON_W = 220;
const BUTTON_H = 52;

export class BlitzResultScene extends Phaser.Scene {
  private solved = 0;
  private best = 0;
  private isNewBest = false;

  /** Fast referanse, så SHUTDOWN kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() {
    super(SCENE.blitzResult);
  }

  /** Phaser gjenbruker sceneinstansen, så feltene må nullstilles her og ikke bare i initialiseringen. */
  init(data: Partial<BlitzResultData> = {}): void {
    this.solved = data.solved ?? 0;
    this.best = data.best ?? 0;
    this.isNewBest = data.isNewBest ?? false;
  }

  create(): void {
    this.build();
    if (this.isNewBest) audio.playAchievement();
    else audio.playFailure();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
  }

  private build(): void {
    const cx = this.scale.width / 2;
    const h = this.scale.height;

    makeLabel(this, cx, h * 0.2, 'Tiden er ute', { size: 40, color: COLORS.danger, bold: true });
    makeLabel(this, cx, h * 0.2 + 60, `Løste brett: ${this.solved}`, { size: 24, bold: true });
    makeLabel(this, cx, h * 0.2 + 96, `Beste: ${this.best}`, { size: 18, color: COLORS.inkMuted, font: 'body' });
    if (this.isNewBest) {
      makeLabel(this, cx, h * 0.2 + 126, 'Ny rekord!', { size: 20, color: COLORS.success, bold: true });
    }

    const buttonsTop = h * 0.62;
    makeButton(this, {
      x: cx, y: buttonsTop, width: BUTTON_W, height: BUTTON_H, label: 'Igjen', accent: COLORS.danger,
      enabled: this.scene.get(SCENE.board) !== null,
      onClick: () => this.scene.start(SCENE.board, { mode: 'blitz' }),
    });
    makeButton(this, {
      x: cx, y: buttonsTop + BUTTON_H + SPACE.md, width: BUTTON_W, height: BUTTON_H, label: 'Meny', accent: COLORS.inkMuted,
      onClick: () => this.scene.start(SCENE.menu),
    });
  }
}
