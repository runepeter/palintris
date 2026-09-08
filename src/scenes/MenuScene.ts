import { screenWidth, screenHeight } from './viewport';
import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, cssColor, worldAccent } from '../theme/theme';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';
import { makeBackdrop } from './art';
import { TileView } from './TileView';
import { makeTile } from '../core/tiles';

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
    makeBackdrop(this, 'hero');
    const cx = screenWidth(this) / 2;
    const h = screenHeight(this);
    const compact = h < 600;
    const width = Math.min(screenWidth(this) - 64, 328);
    makeLabel(this, cx, h * 0.075, 'ET LITE EVENTYR I SYMMETRI', { size: 10, color: COLORS.star, font: 'body' }).setLetterSpacing(2.5).setVisible(!compact);
    makeLabel(this, cx, h * 0.135, 'PALINTRIS', { size: Math.min(compact ? 32 : 44, screenWidth(this) * 0.105), color: COLORS.ink, bold: true })
      .setLetterSpacing(3).setShadow(0, 3, cssColor(COLORS.shadow), 8, true, true);
    makeLabel(this, cx, h * 0.19 + (compact ? 7 : 0), 'Finn balansen. Åpne speilverdenen.', { size: 13, color: COLORS.inkMuted, font: 'body' });

    const tileSize = compact ? 38 : 52;
    const previewY = h * 0.43;
    ['A', 'E', 'C', 'E', 'A'].forEach((symbol, i) => {
      const tile = new TileView(this, makeTile(i, symbol));
      tile.setTile(makeTile(i, symbol), tileSize, services(this).settings().colorBlind);
      tile.setPosition(cx + (i - 2) * (tileSize + 5), previewY + Math.abs(i - 2) * 5);
      tile.setAngle((i - 2) * 5);
    });

    const top = Math.max(h * 0.61, previewY + tileSize + 38);
    const mainHeight = compact ? 44 : 58;
    const secondaryY = top + (compact ? 54 : 72);
    makeLabel(this, cx, top - mainHeight / 2 - 23, 'LIKE FRA BEGGE SIDER', { size: 10, color: COLORS.star, font: 'body' }).setLetterSpacing(2);
    makeButton(this, { x: cx, y: top, width, height: mainHeight, label: 'Kampanje  →', labelSize: 21,
      accent: worldAccent(1), onClick: () => this.scene.start(SCENE.worldMap) });
    const half = (width - 12) / 2;
    makeButton(this, { x: cx - (half + 12) / 2, y: secondaryY, width: half, height: 46, label: '◈  Daglig',
      accent: COLORS.glow, onClick: () => this.scene.start(SCENE.daily) });
    makeButton(this, { x: cx + (half + 12) / 2, y: secondaryY, width: half, height: 46, label: 'ϟ  Blitz',
      accent: COLORS.danger, onClick: () => this.scene.start(SCENE.board, { mode: 'blitz' }) });
    makeButton(this, { x: cx, y: secondaryY + 58, width: 176, height: 38, label: 'Innstillinger', labelSize: 13,
      accent: COLORS.line, onClick: () => this.scene.start(SCENE.settings) });
    if (!compact) makeLabel(this, cx, h - 40, 'Bytt. Speil. Finn harmonien.', { size: 11, color: COLORS.inkMuted, font: 'body' });
  }
}
