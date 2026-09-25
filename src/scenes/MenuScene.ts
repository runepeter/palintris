import { screenWidth, screenHeight } from './viewport';
import Phaser from 'phaser';
import { audio } from '../audio/sound';
import { COLORS, cssColor, worldAccent } from '../theme/theme';
import { services } from './services';
import { makeButton, makeLabel, SCENE } from './ui';
import { makeBackdrop } from './art';
import { TileView } from './TileView';
import { makeTile } from '../core/tiles';
import { campaignSummary } from '../game/feedback';

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
    if (screenHeight(this) < 560 && screenWidth(this) > screenHeight(this) * 1.25) { this.buildLandscape(); return; }
    makeBackdrop(this, 'hero');
    const cx = screenWidth(this) / 2;
    const h = screenHeight(this);
    const s = services(this);
    const progress = campaignSummary(s.store.stars(), s.store.data.blitz.best);
    const compact = h < 600;
    const width = Math.min(screenWidth(this) - 64, 328);
    makeLabel(this, cx, h * 0.075, 'ET LITE EVENTYR I SYMMETRI', { size: 10, color: COLORS.star, font: 'body' }).setLetterSpacing(2.5).setVisible(!compact);
    makeLabel(this, cx, h * 0.135, 'PALINTRIS', { size: Math.min(compact ? 32 : 44, screenWidth(this) * 0.105), color: COLORS.ink, bold: true })
      .setLetterSpacing(3).setShadow(0, 3, cssColor(COLORS.shadow), 8, true, true);
    makeLabel(this, cx, h * 0.19 + (compact ? 7 : 0), 'Finn balansen. Åpne speilverdenen.', { size: 13, color: COLORS.inkMuted, font: 'body' });

    const tileSize = compact ? 38 : 52;
    const previewY = h * (compact ? 0.29 : 0.32);
    ['A', 'E', 'C', 'E', 'A'].forEach((symbol, i) => {
      const tile = new TileView(this, makeTile(i, symbol));
      tile.setTile(makeTile(i, symbol), tileSize, s.settings().colorBlind);
      tile.setPosition(cx + (i - 2) * (tileSize + 5), previewY + Math.abs(i - 2) * 5);
      tile.setAngle((i - 2) * 5);
    });

    const top = Math.max(h * 0.61, previewY + tileSize + 38);
    const mainHeight = compact ? 44 : 58;
    const secondaryY = top + (compact ? 54 : 72);
    const progressY = top - mainHeight / 2 - (compact ? 15 : 19);
    const progressBar = this.add.graphics();
    const progressWidth = width - 48;
    progressBar.fillStyle(COLORS.line, 0.55);
    progressBar.fillRoundedRect(cx - progressWidth / 2, progressY + 13, progressWidth, 3, 1.5);
    progressBar.fillStyle(worldAccent(1), 0.95);
    progressBar.fillRoundedRect(cx - progressWidth / 2, progressY + 13, progressWidth * (progress.solved / progress.total), 3, 1.5);
    makeLabel(this, cx, progressY, `★ ${progress.stars}  ·  ${progress.solved}/${progress.total} speil  ·  Blitz ${progress.blitzBest}`, {
      size: compact ? 10 : 12, color: COLORS.star, font: 'body', bold: true,
    });
    makeButton(this, { x: cx, y: top, width, height: mainHeight, label: progress.hasProgress ? 'Fortsett reisen  →' : 'Start eventyret  →', labelSize: 21,
      accent: worldAccent(1), onClick: () => this.scene.start(SCENE.worldMap) });
    makeLabel(this, cx, top - 139, 'NYTT EVENTYR · 9 ROM · RELIKVIER', { size: 10, color: COLORS.glow, font: 'body', bold: true }).setLetterSpacing(1.2).setBackgroundColor(cssColor(COLORS.panel)).setPadding(5, 3);
    makeButton(this, { x: cx, y: top - 100, width, height: 60, label: 'Speilekspedisjonen  →', labelSize: 19,
      accent: COLORS.glow, onClick: () => this.scene.start(SCENE.expedition) });
    const half = (width - 12) / 2;
    makeButton(this, { x: cx - (half + 12) / 2, y: secondaryY, width: half, height: 46, label: '◈  Daglig',
      accent: COLORS.glow, onClick: () => this.scene.start(SCENE.daily) });
    makeButton(this, { x: cx + (half + 12) / 2, y: secondaryY, width: half, height: 46, label: 'ϟ  Blitz',
      accent: COLORS.danger, onClick: () => this.scene.start(SCENE.board, { mode: 'blitz' }) });
    const bottomY = secondaryY + (compact ? 50 : 58);
    if (import.meta.env.DEV) {
      makeButton(this, { x: cx - (half + 12) / 2, y: bottomY, width: half, height: 44, label: 'Sticky · prøv', labelSize: 13,
        accent: COLORS.glow, onClick: () => this.scene.start(SCENE.board, { mode: 'sticky' }) });
    }
    makeButton(this, { x: import.meta.env.DEV ? cx + (half + 12) / 2 : cx, y: bottomY, width: import.meta.env.DEV ? half : width, height: 44, label: 'Innstillinger', labelSize: 13,
      accent: COLORS.line, onClick: () => this.scene.start(SCENE.settings) });
    if (!compact) makeLabel(this, cx, h - 40, 'Bytt. Speil. Finn harmonien.', { size: 11, color: COLORS.inkMuted, font: 'body' });
  }

  private buildLandscape(): void {
    makeBackdrop(this, 'hero', 1000);
    const w = screenWidth(this);
    const h = screenHeight(this);
    const x = w * 0.72;
    const width = Math.min(320, w * 0.43);
    makeLabel(this, w * 0.27, h * 0.27, 'PALINTRIS', { size: 34, bold: true, color: COLORS.ink }).setLetterSpacing(2);
    makeLabel(this, w * 0.27, h * 0.39, 'Finn balansen. Åpne speilverdenen.', { size: 12, font: 'body', color: COLORS.inkMuted });
    ['A', 'E', 'C', 'E', 'A'].forEach((symbol, i) => {
      const tile = new TileView(this, makeTile(i, symbol));
      tile.setTile(makeTile(i, symbol), 40, services(this).settings().colorBlind);
      tile.setPosition(w * 0.27 + (i - 2) * 45, h * 0.6 + Math.abs(i - 2) * 4);
    });
    makeButton(this, { x, y: h * 0.2, width, height: 50, label: 'Speilekspedisjonen →', labelSize: 18, accent: COLORS.glow, onClick: () => this.scene.start(SCENE.expedition) });
    makeButton(this, { x, y: h * 0.39, width, height: 48, label: 'Kampanje →', accent: COLORS.star, onClick: () => this.scene.start(SCENE.worldMap) });
    const half = (width - 12) / 2;
    makeButton(this, { x: x - (half + 12) / 2, y: h * 0.58, width: half, height: 44, label: 'Daglig', accent: COLORS.glow, onClick: () => this.scene.start(SCENE.daily) });
    makeButton(this, { x: x + (half + 12) / 2, y: h * 0.58, width: half, height: 44, label: 'Blitz', accent: COLORS.danger, onClick: () => this.scene.start(SCENE.board, { mode: 'blitz' }) });
    makeButton(this, { x, y: h * 0.77, width, height: 44, label: 'Innstillinger', accent: COLORS.line, onClick: () => this.scene.start(SCENE.settings) });
  }

}
