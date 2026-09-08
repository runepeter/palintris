import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, SPACE, worldAccent } from '../theme/theme';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';

const BUTTON_W = 220;
const BUTTON_H = 52;

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
    // Kommer fra et brett der gameplay-sporet fortsatt spiller: bytt tilbake til menysporet.
    // Uten lyd i gang ennå (autoplay-policy) venter vi til første trykk, som håndteres under.
    if (services(this).settings().music && audio.isMusicPlaying() && audio.currentTrack() !== 'menu') {
      audio.startMusic('menu');
    }
    this.input.once('pointerdown', () => audio.startMusic('menu'));
  }

  private build(): void {
    const cx = this.scale.width / 2;
    const h = this.scale.height;
    makeLabel(this, cx, h * 0.22, 'Palintris', { size: 56, color: worldAccent(1), bold: true });
    makeLabel(this, cx, h * 0.22 + 44, 'Gjør rekka til et palindrom', { size: 18, color: COLORS.inkMuted, font: 'body' });

    const hasBoard = this.scene.get(SCENE.board) !== null;
    const top = h * 0.46;
    const pitch = BUTTON_H + SPACE.md;
    const button = (row: number, label: string, accent: number, enabled: boolean, onClick: () => void): void => {
      makeButton(this, { x: cx, y: top + pitch * row, width: BUTTON_W, height: BUTTON_H, label, accent, enabled, onClick });
    };
    button(0, 'Kampanje', worldAccent(1), this.scene.get(SCENE.worldMap) !== null, () => this.scene.start(SCENE.worldMap));
    button(1, 'Daglig', COLORS.inkMuted, this.scene.get(SCENE.daily) !== null, () => this.scene.start(SCENE.daily));
    button(2, 'Blitz', COLORS.danger, hasBoard, () => this.scene.start(SCENE.board, { mode: 'blitz' }));
    button(3, 'Innstillinger', COLORS.inkMuted, true, () => this.scene.start(SCENE.settings));
  }
}
