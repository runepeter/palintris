import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, SPACE, worldAccent } from '../theme/theme';
import { makeButton, makeLabel, SCENE } from './ui';

export class MenuScene extends Phaser.Scene {
  /** Fast referanse, så SHUTDOWN kan koble den av den globale ScaleManager. */
  private readonly onResize = (): void => {
    this.children.removeAll(true);
    this.build();
  };

  constructor() {
    super(SCENE.menu);
  }

  create(): void {
    this.build();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize));
    this.input.once('pointerdown', () => audio.startMusic('menu'));
  }

  private build(): void {
    const cx = this.scale.width / 2;
    const h = this.scale.height;
    makeLabel(this, cx, h * 0.28, 'Palintris', { size: 56, color: worldAccent(1), bold: true });
    makeLabel(this, cx, h * 0.28 + 44, 'Gjør rekka til et palindrom', { size: 18, color: COLORS.inkMuted, font: 'body' });
    const canPlay = this.scene.get(SCENE.worldMap) !== null;
    makeButton(this, { x: cx, y: h * 0.55, width: 220, height: 56, label: 'Spill', accent: worldAccent(1), enabled: canPlay, onClick: () => this.scene.start(SCENE.worldMap) });
    makeButton(this, { x: cx, y: h * 0.55 + 56 + SPACE.lg, width: 220, height: 48, label: 'Innstillinger', accent: COLORS.inkMuted, onClick: () => this.scene.start(SCENE.settings) });
  }
}
